import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FilmConsentAction, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RequestUser } from "../../common/auth/current-user.decorator";
import { BulkFilmSalesAction, BulkUpdateRightsDto } from "./dto/bulk-update-rights.dto";
import { UpdateRightsDto } from "./dto/update-rights.dto";

@Injectable()
export class CommercialRightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getOwnedDesignOrThrow(designId: string, user: RequestUser) {
    const design = await this.prisma.designAsset.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException("Design not found");
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin && design.designerId !== user.sub) throw new ForbiddenException("Not your design");
    return { design, isAdmin };
  }

  async getByDesign(designId: string, user: RequestUser) {
    await this.getOwnedDesignOrThrow(designId, user);
    return this.prisma.commercialRights.findUnique({ where: { designAssetId: designId } });
  }

  async updateByDesign(designId: string, user: RequestUser, dto: UpdateRightsDto) {
    const { isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const before = await this.prisma.commercialRights.findUnique({ where: { designAssetId: designId } });
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: {
        allowProductSales: dto.allowProductSales,
        allowMarketplacePublishing: dto.allowMarketplacePublishing,
        allowCorporateBidding: dto.allowCorporateBidding,
        filmRoyaltyRate: dto.filmRoyaltyRate,
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: isAdmin ? "rights.admin-override" : "rights.update-own",
      entityType: "CommercialRights",
      entityId: updated.id,
      metadata: { before, after: updated },
    });
    return updated;
  }

  async updateBulk(user: RequestUser, dto: BulkUpdateRightsDto) {
    const hasRightsChange =
      dto.allowProductSales !== undefined ||
      dto.allowMarketplacePublishing !== undefined ||
      dto.allowCorporateBidding !== undefined ||
      dto.filmSalesAction !== undefined;
    if (!hasRightsChange) {
      throw new BadRequestException("Choose at least one commercial right to update");
    }

    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const actorTenantId = user.tenantId ?? user.tid;
    return this.runSerializableTransaction(async (tx) => {
      const designs = await tx.designAsset.findMany({
        where: { id: { in: dto.designIds } },
        include: {
          commercialRights: true,
          versions: { orderBy: { createdAt: "desc" }, take: 1 },
          designer: {
            select: {
              tenantMemberships: {
                where: { status: "ACTIVE" },
                select: { tenantId: true },
              },
            },
          },
        },
      });

      if (!isAdmin && (designs.length !== dto.designIds.length || designs.some((design) => design.designerId !== user.sub))) {
        throw new ForbiddenException("One or more selected designs cannot be managed by this account");
      }
      if (
        user.role === UserRole.ADMIN &&
        (
          !actorTenantId ||
          designs.length !== dto.designIds.length ||
          designs.some((design) => {
            if (design.tenantId) return design.tenantId !== actorTenantId;
            const activeTenantIds = design.designer.tenantMemberships.map((membership) => membership.tenantId);
            return activeTenantIds.length !== 1 || activeTenantIds[0] !== actorTenantId;
          })
        )
      ) {
        throw new ForbiddenException("One or more selected designs are outside the active workspace");
      }
      if (isSuperAdmin && designs.length !== dto.designIds.length) {
        throw new NotFoundException("One or more selected designs were not found");
      }
      if (designs.some((design) => !design.commercialRights)) {
        throw new BadRequestException("One or more selected designs do not have commercial-rights records");
      }

      if (dto.filmSalesAction === BulkFilmSalesAction.ENABLE) {
        const missingVersionCount = designs.filter((design) => design.versions.length === 0).length;
        if (missingVersionCount > 0) {
          throw new BadRequestException(
            `Film sales cannot be enabled because ${missingVersionCount} selected design${missingVersionCount === 1 ? " has" : "s have"} no verified version`,
          );
        }
      }

      const designsById = new Map(designs.map((design) => [design.id, design]));
      const orderedDesigns = dto.designIds.map((designId) => designsById.get(designId)!);
      const changedAt = new Date();
      const settings = dto.filmSalesAction
        ? await tx.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } })
        : null;
      const items = [];
      let updatedCount = 0;

      for (const design of orderedDesigns) {
        const before = design.commercialRights!;
        const data: Prisma.CommercialRightsUpdateInput = {};
        const ordinaryFields: string[] = [];

        if (dto.allowProductSales !== undefined && dto.allowProductSales !== before.allowProductSales) {
          data.allowProductSales = dto.allowProductSales;
          ordinaryFields.push("allowProductSales");
        }
        if (
          dto.allowMarketplacePublishing !== undefined &&
          dto.allowMarketplacePublishing !== before.allowMarketplacePublishing
        ) {
          data.allowMarketplacePublishing = dto.allowMarketplacePublishing;
          ordinaryFields.push("allowMarketplacePublishing");
        }
        if (dto.allowCorporateBidding !== undefined && dto.allowCorporateBidding !== before.allowCorporateBidding) {
          data.allowCorporateBidding = dto.allowCorporateBidding;
          ordinaryFields.push("allowCorporateBidding");
        }

        const latestVersion = design.versions[0];
        let filmChanged = false;
        if (dto.filmSalesAction === BulkFilmSalesAction.ENABLE) {
          if (!latestVersion) {
            throw new BadRequestException("Upload a verified design version before enabling film sales");
          }
          if (!before.allowFilmSales || before.filmConsentRevokedAt || before.filmConsentVersionId !== latestVersion.id) {
            data.allowFilmSales = true;
            data.filmConsentGrantedAt = changedAt;
            data.filmConsentRevokedAt = null;
            data.filmConsentVersionId = latestVersion.id;
            filmChanged = true;
          }
        } else if (dto.filmSalesAction === BulkFilmSalesAction.DISABLE && before.allowFilmSales) {
          data.allowFilmSales = false;
          data.filmConsentRevokedAt = changedAt;
          filmChanged = true;
        }

        if (Object.keys(data).length === 0) {
          items.push(before);
          continue;
        }

        const updated = await tx.commercialRights.update({
          where: { designAssetId: design.id },
          data,
        });
        updatedCount += 1;
        items.push(updated);

        if (ordinaryFields.length > 0) {
          await tx.auditLog.create({
            data: {
              actorId: user.sub,
              actorEmail: user.email,
              actorRole: user.role,
              tenantId: design.tenantId ?? actorTenantId,
              action: isAdmin ? "rights.admin-override" : "rights.update-own",
              entityType: "CommercialRights",
              entityId: updated.id,
              metadata: this.cleanJson({
                bulk: true,
                selectedDesignCount: dto.designIds.length,
                changedFields: ordinaryFields,
                before,
                after: updated,
              }),
            },
          });
        }

        if (filmChanged) {
          const enabling = dto.filmSalesAction === BulkFilmSalesAction.ENABLE;
          await tx.filmConsentEvent.create({
            data: {
              designAssetId: design.id,
              designerId: design.designerId,
              actorId: user.sub,
              designVersionId: enabling ? latestVersion.id : before.filmConsentVersionId,
              action: enabling
                ? isAdmin
                  ? FilmConsentAction.ADMIN_ENABLED
                  : FilmConsentAction.ENABLED
                : isAdmin
                  ? FilmConsentAction.ADMIN_REVOKED
                  : FilmConsentAction.REVOKED,
              reason: dto.reason?.trim() || null,
              policySnapshotJson: this.cleanJson({
                settingsId: settings?.id ?? null,
                settingsVersion: settings?.settingsVersion ?? null,
                revocationPolicy: settings?.revocationPolicy ?? null,
                consentPolicyJson: settings?.consentPolicyJson ?? null,
              }),
              royaltySnapshotJson: this.cleanJson({
                defaultRoyaltyBasis: settings?.defaultRoyaltyBasis ?? null,
                defaultRoyaltyValue: settings?.defaultRoyaltyValue ? Number(settings.defaultRoyaltyValue) : null,
                filmRoyaltyRate: updated.filmRoyaltyRate,
              }),
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.sub,
              actorEmail: user.email,
              actorRole: user.role,
              tenantId: design.tenantId ?? actorTenantId,
              action: enabling ? "rights.enable-film" : "rights.disable-film",
              entityType: "CommercialRights",
              entityId: updated.id,
              metadata: this.cleanJson({
                bulk: true,
                selectedDesignCount: dto.designIds.length,
                reason: dto.reason,
                designVersionId: enabling ? latestVersion.id : before.filmConsentVersionId,
                isAdmin,
              }),
            },
          });
        }
      }

      return {
        requestedCount: dto.designIds.length,
        updatedCount,
        unchangedCount: dto.designIds.length - updatedCount,
        items,
      };
    });
  }

  async enableFilmSales(designId: string, user: RequestUser, reason?: string) {
    const { design, isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const latestVersion = await tx.designVersion.findFirst({ where: { designAssetId: designId }, orderBy: { createdAt: "desc" } });
      if (!latestVersion) {
        throw new BadRequestException("Upload a verified design version before enabling film sales");
      }
      const settings = await tx.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
      const rights = await tx.commercialRights.update({
        where: { designAssetId: designId },
        data: { allowFilmSales: true, filmConsentGrantedAt: new Date(), filmConsentRevokedAt: null, filmConsentVersionId: latestVersion.id },
      });
      await tx.filmConsentEvent.create({
        data: {
          designAssetId: designId,
          designerId: design.designerId,
          actorId: user.sub,
          designVersionId: latestVersion.id,
          action: isAdmin ? FilmConsentAction.ADMIN_ENABLED : FilmConsentAction.ENABLED,
          reason: reason?.trim() || null,
          policySnapshotJson: this.cleanJson({
            settingsId: settings?.id ?? null,
            settingsVersion: settings?.settingsVersion ?? null,
            revocationPolicy: settings?.revocationPolicy ?? null,
            consentPolicyJson: settings?.consentPolicyJson ?? null,
          }),
          royaltySnapshotJson: this.cleanJson({
            defaultRoyaltyBasis: settings?.defaultRoyaltyBasis ?? null,
            defaultRoyaltyValue: settings?.defaultRoyaltyValue ? Number(settings.defaultRoyaltyValue) : null,
            filmRoyaltyRate: rights.filmRoyaltyRate,
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          actorEmail: user.email,
          actorRole: user.role,
          tenantId: design.tenantId,
          action: "rights.enable-film",
          entityType: "CommercialRights",
          entityId: rights.id,
          metadata: this.cleanJson({ reason, designVersionId: latestVersion.id, isAdmin }),
        },
      });
      return rights;
    });
    return updated;
  }

  async disableFilmSales(designId: string, user: RequestUser, reason?: string) {
    const { design, isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const settings = await tx.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
      const rights = await tx.commercialRights.update({
        where: { designAssetId: designId },
        data: { allowFilmSales: false, filmConsentRevokedAt: new Date() },
      });
      await tx.filmConsentEvent.create({
        data: {
          designAssetId: designId,
          designerId: design.designerId,
          actorId: user.sub,
          designVersionId: rights.filmConsentVersionId,
          action: isAdmin ? FilmConsentAction.ADMIN_REVOKED : FilmConsentAction.REVOKED,
          reason: reason?.trim() || null,
          policySnapshotJson: this.cleanJson({
            settingsId: settings?.id ?? null,
            settingsVersion: settings?.settingsVersion ?? null,
            revocationPolicy: settings?.revocationPolicy ?? null,
            consentPolicyJson: settings?.consentPolicyJson ?? null,
          }),
          royaltySnapshotJson: this.cleanJson({ filmRoyaltyRate: rights.filmRoyaltyRate }),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          actorEmail: user.email,
          actorRole: user.role,
          tenantId: design.tenantId,
          action: "rights.disable-film",
          entityType: "CommercialRights",
          entityId: rights.id,
          metadata: this.cleanJson({ reason, isAdmin }),
        },
      });
      return rights;
    });
    return updated;
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private async runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
        if (code !== "P2034" || attempt === maxAttempts) throw error;
      }
    }
    throw new Error("Serializable transaction retry loop exhausted");
  }
}

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FilmConsentAction, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RequestUser } from "../../common/auth/current-user.decorator";
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

  getByDesign(designId: string) {
    return this.prisma.commercialRights.findUnique({ where: { designAssetId: designId } });
  }

  async updateByDesign(designId: string, user: RequestUser, dto: UpdateRightsDto) {
    const { isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const before = await this.prisma.commercialRights.findUnique({ where: { designAssetId: designId } });
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: dto,
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

  async enableFilmSales(designId: string, user: RequestUser, reason?: string) {
    const { design, isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const latestVersion = await this.prisma.designVersion.findFirst({ where: { designAssetId: designId }, orderBy: { createdAt: "desc" } });
    const settings = await this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: { allowFilmSales: true, filmConsentGrantedAt: new Date(), filmConsentRevokedAt: null, filmConsentVersionId: latestVersion?.id },
    });
    await this.prisma.filmConsentEvent.create({
      data: {
        designAssetId: designId,
        designerId: design.designerId,
        actorId: user.sub,
        designVersionId: latestVersion?.id,
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
          filmRoyaltyRate: updated.filmRoyaltyRate,
        }),
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "rights.enable-film",
      entityType: "CommercialRights",
      entityId: updated.id,
      metadata: { reason, designVersionId: latestVersion?.id, isAdmin },
    });
    return updated;
  }

  async disableFilmSales(designId: string, user: RequestUser, reason?: string) {
    const { design, isAdmin } = await this.getOwnedDesignOrThrow(designId, user);
    const settings = await this.prisma.filmSaleSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: { allowFilmSales: false, filmConsentRevokedAt: new Date() },
    });
    await this.prisma.filmConsentEvent.create({
      data: {
        designAssetId: designId,
        designerId: design.designerId,
        actorId: user.sub,
        designVersionId: updated.filmConsentVersionId,
        action: isAdmin ? FilmConsentAction.ADMIN_REVOKED : FilmConsentAction.REVOKED,
        reason: reason?.trim() || null,
        policySnapshotJson: this.cleanJson({
          settingsId: settings?.id ?? null,
          settingsVersion: settings?.settingsVersion ?? null,
          revocationPolicy: settings?.revocationPolicy ?? null,
          consentPolicyJson: settings?.consentPolicyJson ?? null,
        }),
        royaltySnapshotJson: this.cleanJson({ filmRoyaltyRate: updated.filmRoyaltyRate }),
      },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "rights.disable-film",
      entityType: "CommercialRights",
      entityId: updated.id,
      metadata: { reason, isAdmin },
    });
    return updated;
  }

  private cleanJson<T>(value: T): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }
}

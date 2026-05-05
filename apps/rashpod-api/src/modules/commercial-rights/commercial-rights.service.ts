import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
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

  async enableFilmSales(designId: string, user: RequestUser) {
    await this.getOwnedDesignOrThrow(designId, user);
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: { allowFilmSales: true, filmConsentGrantedAt: new Date(), filmConsentRevokedAt: null },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "rights.enable-film",
      entityType: "CommercialRights",
      entityId: updated.id,
    });
    return updated;
  }

  async disableFilmSales(designId: string, user: RequestUser) {
    await this.getOwnedDesignOrThrow(designId, user);
    const updated = await this.prisma.commercialRights.update({
      where: { designAssetId: designId },
      data: { allowFilmSales: false, filmConsentRevokedAt: new Date() },
    });
    await this.audit.log({
      actorId: user.sub,
      action: "rights.disable-film",
      entityType: "CommercialRights",
      entityId: updated.id,
    });
    return updated;
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StorageService } from "../files/storage.service";
import { PrintfulClient } from "./printful.client";
import { canonicalPlacementKind } from "./printful-placement";

@Injectable()
export class PrintfulFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly client: PrintfulClient,
  ) {}

  async ensurePrintfulFileForDesign(designId: string, placement?: string) {
    const design = await this.prisma.designAsset.findUnique({
      where: { id: designId },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    const normalizedPlacement = canonicalPlacementKind(placement);
    const exactVersion = design?.versions.find((version) => (
      normalizedPlacement && canonicalPlacementKind(version.placement) === normalizedPlacement
    ));
    const defaultVersion = design?.versions.find((version) => !version.placement);
    const sourceVersion = exactVersion ?? defaultVersion ?? (normalizedPlacement ? undefined : design?.versions[0]);
    if (!sourceVersion?.fileKey) throw new Error("DESIGN_FILE_MISSING");

    if (!sourceVersion.placement) {
      const existing = await this.prisma.printfulFileMapping.findFirst({
        where: { designId, status: "READY", printfulFileId: { not: null } },
        orderBy: { updatedAt: "desc" },
      });
      if (existing?.printfulFileId && existing.printfulUrl) return existing;
    }

    const fileKey = sourceVersion.fileKey;
    const signedUrl = await this.storage.createSignedReadUrl({ objectKey: fileKey, expiresSeconds: 60 * 60 });
    const mapping = await this.prisma.printfulFileMapping.create({
      data: { designId, status: "PENDING", originalUrl: signedUrl },
    });

    try {
      const response = await this.client.uploadFileFromUrl(signedUrl);
      const fileId = response.result?.id;
      if (!fileId) throw new Error("PRINTFUL_FILE_UPLOAD_FAILED");
      return this.prisma.printfulFileMapping.update({
        where: { id: mapping.id },
        data: {
          status: "READY",
          printfulFileId: String(fileId),
          printfulUrl: response.result?.url ?? null,
        },
      });
    } catch (error) {
      await this.prisma.printfulFileMapping.update({
        where: { id: mapping.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  }
}

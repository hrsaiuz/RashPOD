import { GeneratedAssetStatus } from "@prisma/client";
import { getPrismaClient } from "./db";
import { GeneratedAssetRecord, WorkerRepository } from "./repository";

export class PrismaAssetRepository implements WorkerRepository {
  private readonly prisma = getPrismaClient();

  async getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null> {
    const row = await this.prisma.generatedAsset.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }

  async updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord> {
    const row = await this.prisma.generatedAsset.update({
      where: { id },
      data: {
        status: data.status as GeneratedAssetStatus | undefined,
        fileKey: data.fileKey,
        errorMessage: data.errorMessage,
        widthPx: data.widthPx,
        heightPx: data.heightPx,
      },
    });
    return {
      id: row.id,
      status: row.status,
      fileKey: row.fileKey ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      widthPx: row.widthPx ?? undefined,
      heightPx: row.heightPx ?? undefined,
    };
  }
}

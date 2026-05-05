export type AssetStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface GeneratedAssetRecord {
  id: string;
  status: AssetStatus;
  fileKey?: string;
  errorMessage?: string;
  widthPx?: number;
  heightPx?: number;
}

export interface WorkerRepository {
  getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null>;
  updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord>;
}

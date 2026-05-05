import { GeneratedAssetRecord, WorkerRepository } from "./repository";

export class InMemoryWorkerRepository implements WorkerRepository {
  private readonly store = new Map<string, GeneratedAssetRecord>();

  constructor(initial: GeneratedAssetRecord[] = []) {
    for (const item of initial) this.store.set(item.id, item);
  }

  async getGeneratedAsset(id: string): Promise<GeneratedAssetRecord | null> {
    return this.store.get(id) ?? null;
  }

  async updateGeneratedAsset(
    id: string,
    data: Partial<Pick<GeneratedAssetRecord, "status" | "fileKey" | "errorMessage" | "widthPx" | "heightPx">>,
  ): Promise<GeneratedAssetRecord> {
    const current = this.store.get(id);
    if (!current) {
      const created: GeneratedAssetRecord = { id, status: "PENDING", ...data };
      this.store.set(id, created);
      return created;
    }
    const updated = { ...current, ...data };
    this.store.set(id, updated);
    return updated;
  }
}

import { WorkerRepository } from "../repository";

export interface PrintfulFetchPort {
  (url: string, init: { method: string; headers: Record<string, string> }): Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;
}

export class PrintfulCatalogSyncJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly fetcher: PrintfulFetchPort = fetch,
  ) {}

  async handleSync(input: { requestedBy?: string }) {
    const repo = this.integrationRepo();
    if (process.env.PRINTFUL_ENABLED !== "true") return this.fail("PRINTFUL_NOT_CONFIGURED", "Printful integration is disabled.");
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) return this.fail("PRINTFUL_API_TOKEN_MISSING", "Printful API token is missing.");

    const apiBaseUrl = process.env.PRINTFUL_API_BASE_URL || "https://api.printful.com";
    await repo.createIntegrationLog({
      action: "printful.catalog.sync",
      status: "PENDING",
      responseSummaryJson: { requestedBy: input.requestedBy ?? null, apiBaseUrl },
    });

    try {
      const response = await this.fetcher(`${apiBaseUrl.replace(/\/$/, "")}/store/products`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.text();
        await repo.createIntegrationLog({
          action: "printful.catalog.sync",
          status: "FAILED",
          errorCode: `PRINTFUL_HTTP_${response.status}`,
          errorMessage: body.slice(0, 500),
        });
        return { failed: true, errorCode: `PRINTFUL_HTTP_${response.status}` };
      }

      const payload = await response.json();
      const count = Array.isArray((payload as { result?: unknown }).result) ? ((payload as { result: unknown[] }).result).length : null;
      await repo.createIntegrationLog({
        action: "printful.catalog.sync",
        status: "SUCCESS",
        responseSummaryJson: { productCount: count, persistedTemplates: 0 },
      });
      return { synced: true, productCount: count, persistedTemplates: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printful catalog sync failed";
      await repo.createIntegrationLog({ action: "printful.catalog.sync", status: "FAILED", errorCode: "PRINTFUL_SYNC_FAILED", errorMessage: message });
      return { failed: true, errorCode: "PRINTFUL_SYNC_FAILED" };
    }
  }

  private async fail(errorCode: string, errorMessage: string) {
    const repo = this.integrationRepo();
    await repo.createIntegrationLog({ action: "printful.catalog.sync", status: "FAILED", errorCode, errorMessage });
    return { failed: true, errorCode };
  }

  private integrationRepo() {
    if (!this.repo.createIntegrationLog) throw new Error("Integration log repository method is not configured");
    return this.repo as Required<Pick<WorkerRepository, "createIntegrationLog">>;
  }
}

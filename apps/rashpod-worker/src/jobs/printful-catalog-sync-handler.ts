import { PrintfulApiClient, mapCatalogProductToTemplate, parsePrintfulSettings } from "@rashpod/printful";
import { WorkerRepository } from "../repository";

export class PrintfulCatalogSyncJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
  ) {}

  async handleSync(input: { requestedBy?: string }) {
    const repo = this.integrationRepo();
    if (!this.client.isEnabled()) return this.fail("PRINTFUL_NOT_CONFIGURED", "Printful integration is disabled.");
    if (!this.client.hasToken()) return this.fail("PRINTFUL_API_TOKEN_MISSING", "Printful API token is missing.");
    if (!repo.getPrintfulSettings || !repo.upsertPrintfulProductTemplate || !repo.ensurePrintfulPlacementPreset) {
      throw new Error("Printful catalog repository methods are not configured");
    }

    const settings = await repo.getPrintfulSettings();
    const allowlist = settings.catalogAllowlist;
    await repo.createIntegrationLog({
      action: "printful.catalog.sync",
      status: "PENDING",
      responseSummaryJson: { requestedBy: input.requestedBy ?? null, allowlistCount: allowlist.length },
    });

    if (allowlist.length === 0) {
      await repo.createIntegrationLog({
        action: "printful.catalog.sync",
        status: "FAILED",
        errorCode: "PRINTFUL_ALLOWLIST_EMPTY",
        errorMessage: "Configure catalogAllowlist in Printful settings before syncing.",
      });
      return { failed: true, errorCode: "PRINTFUL_ALLOWLIST_EMPTY" };
    }

    let persistedTemplates = 0;
    let updatedPresets = 0;
    const errors: Array<{ catalogProductId: number; error: string }> = [];

    for (const item of allowlist) {
      try {
        const productResponse = await this.client.getCatalogProduct(item.catalogProductId);
        const product = (productResponse.result ?? {}) as Record<string, unknown>;
        const technique = item.defaultTechnique ?? "dtg";
        const printfilesResponse = await this.client.getPrintfiles(item.catalogProductId, technique);
        const printfiles = (printfilesResponse.result ?? {}) as Record<string, unknown>;
        const mapped = mapCatalogProductToTemplate({ allowlistItem: item, product, printfiles, storeId: settings.defaultStoreId });
        const template = await repo.upsertPrintfulProductTemplate(mapped);
        persistedTemplates += 1;
        const preset = await repo.ensurePrintfulPlacementPreset(template.id, item.rashpodProductType);
        if (preset.created) updatedPresets += 1;
      } catch (error) {
        errors.push({ catalogProductId: item.catalogProductId, error: error instanceof Error ? error.message : "sync failed" });
      }
    }

    const summary = { persistedTemplates, updatedPresets, errors };
    await repo.createIntegrationLog({
      action: "printful.catalog.sync",
      status: errors.length === allowlist.length ? "FAILED" : "SUCCESS",
      responseSummaryJson: summary,
      errorCode: errors.length ? "PRINTFUL_PARTIAL_SYNC" : undefined,
      errorMessage: errors.length ? `${errors.length} catalog item(s) failed` : undefined,
    });
    return { synced: true, ...summary };
  }

  private async fail(errorCode: string, errorMessage: string) {
    const repo = this.integrationRepo();
    await repo.createIntegrationLog({ action: "printful.catalog.sync", status: "FAILED", errorCode, errorMessage });
    return { failed: true, errorCode };
  }

  private integrationRepo() {
    if (!this.repo.createIntegrationLog) throw new Error("Integration log repository method is not configured");
    return this.repo as Required<Pick<WorkerRepository, "createIntegrationLog" | "getPrintfulSettings" | "upsertPrintfulProductTemplate" | "ensurePrintfulPlacementPreset">>;
  }
}

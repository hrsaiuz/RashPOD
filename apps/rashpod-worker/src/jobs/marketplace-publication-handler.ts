import { PrintfulApiClient, buildPrintfulSyncProductPayload } from "@rashpod/printful";
import { createHash } from "node:crypto";
import { createSignedReadUrl } from "../gcs-signing";
import { MarketplacePublicationPublishContext, WorkerRepository } from "../repository";

const ACTION = "marketplace-publication.publish";

export class MarketplacePublicationJobHandler {
  constructor(
    private readonly repo: WorkerRepository,
    private readonly client = new PrintfulApiClient(),
  ) {}

  async handlePublish(input: { marketplacePublicationId: string; publicationVersion?: string }) {
    const repo = this.publicationRepo();
    const publication = await (repo.getMarketplacePublicationPublishContext?.(input.marketplacePublicationId) ?? repo.getMarketplacePublication(input.marketplacePublicationId));
    if (!publication) throw new Error("Marketplace publication not found");
    const currentMetadata = this.record(publication.metadataJson);
    if (
      input.publicationVersion &&
      typeof currentMetadata.publicationVersion === "string" &&
      input.publicationVersion !== currentMetadata.publicationVersion
    ) {
      await repo.createIntegrationLog({
        productListingId: publication.productListing.id,
        marketplacePublicationId: publication.id,
        action: ACTION,
        status: "SKIPPED",
        errorCode: "STALE_PUBLICATION_VERSION",
        errorMessage: "A newer publication request replaced this job.",
      });
      return { skipped: true, reason: "STALE_PUBLICATION_VERSION" };
    }

    if (publication.status === "NEEDS_REVIEW") {
      await repo.createIntegrationLog({
        productListingId: publication.productListing.id,
        marketplacePublicationId: publication.id,
        action: ACTION,
        status: "SKIPPED",
        errorCode: "MARKETPLACE_NEEDS_REVIEW",
        errorMessage: "Manual marketplace review is required before publishing.",
      });
      return { skipped: true, reason: "MARKETPLACE_NEEDS_REVIEW" };
    }

    const mockupIds = Array.isArray(publication.productListing.mockupAssetIds) ? publication.productListing.mockupAssetIds : [];
    if (mockupIds.length === 0) return this.failPublication(publication, "MISSING_MOCKUPS", "Generated mockups are required before publishing.");

    const providerError = this.providerReadinessError(publication);
    if (providerError) return this.failPublication(publication, providerError, providerError);

    await repo.updateMarketplacePublication(publication.id, { status: "PUBLISHING", errorMessage: null });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "PENDING",
      responseSummaryJson: { marketplace: publication.marketplace, provider: publication.provider },
    });

    if (publication.provider === "PRINTFUL") {
      return this.publishPrintful(repo, publication as MarketplacePublicationPublishContext);
    }

    const providerExternalListingId = this.providerExternalListingId(publication);
    await repo.updateMarketplacePublication(publication.id, {
      status: "PUBLISHED",
      errorMessage: null,
      providerExternalListingId,
      providerSyncProductId: null,
      lastSyncedAt: new Date(),
      metadataJson: { publishedByWorker: true },
    });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "SUCCESS",
      responseSummaryJson: { providerExternalListingId },
    });
    const listing = await repo.markListingPublishedIfComplete(publication.productListing.id);
    return { published: true, marketplacePublicationId: publication.id, providerExternalListingId, listing };
  }

  private async publishPrintful(repo: ReturnType<MarketplacePublicationJobHandler["publicationRepo"]>, publication: MarketplacePublicationPublishContext) {
    const template = publication.printfulProductTemplate ?? publication.selection?.printfulProductTemplate;
    if (!template) return this.failPublication(publication, "PRINTFUL_PUBLISH_CONTEXT_MISSING", "The Printful product template is missing.");
    const selections = publication.compositionSelections?.length ? publication.compositionSelections : publication.selection ? [publication.selection] : [];
    const files: Array<{ fileId: string; placement: string }> = [];
    if (selections.length && repo.ensurePrintfulFileForDesign) {
      try {
        for (const selection of selections) {
          const mapping = await repo.ensurePrintfulFileForDesign(
            selection.designId,
            async (url) => {
              const response = await this.client.uploadFileFromUrl(url);
              const uploadedId = response.result?.id;
              if (uploadedId == null) throw new Error("PRINTFUL_FILE_UPLOAD_FAILED");
              return { fileId: String(uploadedId), printfulUrl: response.result?.url ?? null };
            },
            selection.latestDesignVersion ? { id: selection.latestDesignVersion.id, fileKey: selection.latestDesignVersion.fileKey } : null,
          );
          files.push({ fileId: mapping.printfulFileId, placement: String(selection.providerPlacement ?? selection.placement ?? "front").toLowerCase() });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "PRINTFUL_FILE_UPLOAD_FAILED";
        return this.failPublication(publication, "PRINTFUL_FILE_UPLOAD_FAILED", message);
      }
    }
    if (!files.length && publication.printfulFileId) {
      files.push({ fileId: publication.printfulFileId, placement: String(publication.selection?.providerPlacement ?? publication.selection?.placement ?? template.defaultPlacement ?? "front").toLowerCase() });
    }
    if (!files.length) return this.failPublication(publication, "PRINTFUL_FILE_MISSING", "The approved design files could not be uploaded to Printful.");

    const publicationMetadata = this.record(publication.metadataJson);
    const configuredVariantIds = Array.isArray(publicationMetadata.variantIds)
      ? publicationMetadata.variantIds.map(String).filter(Boolean)
      : [];
    const variantIds = configuredVariantIds.length > 0
      ? configuredVariantIds
      : Array.isArray(template.printfulVariantIds)
        ? template.printfulVariantIds.filter((item): item is string => typeof item === "string")
        : [];
    if (variantIds.length === 0) return this.failPublication(publication, "INVALID_PRINTFUL_VARIANT", "Printful variant IDs are missing.");

    const mainAsset = publication.mockupAssets?.find((asset) => asset.mockupType === "MAIN") ?? publication.mockupAssets?.[0];
    const thumbnailUrl = mainAsset?.objectKey ? await createSignedReadUrl(mainAsset.objectKey, 3600) : mainAsset?.imageUrl ?? undefined;
    const retailPrice = publicationMetadata.retailPrice != null
      ? String(publicationMetadata.retailPrice)
      : template.defaultRetailPrice != null
        ? String(template.defaultRetailPrice)
        : publication.productListing.price != null
          ? String(publication.productListing.price)
          : "24.99";
    const placement = String(publicationMetadata.placement ?? publication.selection?.providerPlacement ?? publication.selection?.placement ?? template.defaultPlacement ?? "front").toLowerCase();
    const externalProductId = this.printfulExternalId(publication.id);

    const payload = buildPrintfulSyncProductPayload({
      title: publication.productListing.title,
      thumbnailUrl,
      variantIds,
      retailPrice,
      fileId: files[0]!.fileId,
      placement,
      files,
      externalProductId,
      externalVariantId: (variantId) => this.printfulExternalId(`${publication.id}:${variantId}`),
    });

    try {
      let existing: Awaited<ReturnType<PrintfulApiClient["getSyncProduct"]>> | null = null;
      const lookupId = publication.providerSyncProductId || `@${externalProductId}`;
      try {
        existing = await this.client.getSyncProduct(lookupId, publication.providerStoreId);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "PRINTFUL_REQUEST_FAILED:404") throw error;
      }

      const existingProduct = this.record(existing?.result?.sync_product);
      const existingProductId = existing?.result?.id ?? existingProduct.id;
      const existingVariants = existing?.result?.sync_variants ?? [];
      const response = existingProductId == null
        ? await this.client.createSyncProduct(payload, publication.providerStoreId)
        : await this.client.updateSyncProduct(
            String(existingProductId),
            {
              ...payload,
              sync_variants: payload.sync_variants.map((variant) => {
                const current = existingVariants.find((item) => Number(item.variant_id) === variant.variant_id);
                return current?.id == null ? variant : { ...variant, id: current.id };
              }),
            },
            publication.providerStoreId,
          );
      const syncProductId = response.result?.id ?? response.result?.sync_product?.id;
      const externalId = syncProductId != null ? String(syncProductId) : undefined;
      if (!externalId) return this.failPublication(publication, "PRINTFUL_SYNC_PRODUCT_FAILED", "Printful did not return a sync product id.");
      const hydrated = await this.client.getSyncProduct(externalId, publication.providerStoreId);
      const syncVariants = hydrated.result?.sync_variants ?? response.result?.sync_variants ?? [];
      const mappedCatalogVariantIds = new Set(
        syncVariants
          .filter((variant) => variant.id != null)
          .map((variant) => String(variant.variant_id ?? variant.catalog_variant_id ?? "")),
      );
      const missingMappings = variantIds.filter((variantId) => !mappedCatalogVariantIds.has(String(variantId)));
      if (missingMappings.length) {
        throw new Error(`PRINTFUL_SYNC_VARIANT_MAPPING_MISSING:${missingMappings.join(",")}`);
      }

      await repo.updateMarketplacePublication(publication.id, {
        status: "PUBLISHED",
        errorMessage: null,
        providerExternalListingId: externalId,
        providerSyncProductId: externalId,
        lastSyncedAt: new Date(),
        metadataJson: {
          ...publicationMetadata,
          publishedByWorker: true,
          printfulSyncProductId: externalId,
          targetStoreId: publication.providerStoreId ?? null,
          syncVariants,
        },
      });
      await repo.createIntegrationLog({
        productListingId: publication.productListing.id,
        marketplacePublicationId: publication.id,
        action: ACTION,
        status: "SUCCESS",
        responseSummaryJson: { providerExternalListingId: externalId, providerSyncProductId: externalId },
      });
      const listing = await repo.markListingPublishedIfComplete(publication.productListing.id);
      return { published: true, marketplacePublicationId: publication.id, providerExternalListingId: externalId, listing };
    } catch (error) {
      const message = error instanceof Error ? error.message : "PRINTFUL_SYNC_PRODUCT_FAILED";
      return this.failPublication(publication, "PRINTFUL_SYNC_PRODUCT_FAILED", message);
    }
  }

  private async failPublication(publication: MarketplacePublicationPublishContext, errorCode: string, errorMessage: string) {
    const repo = this.publicationRepo();
    await repo.updateMarketplacePublication(publication.id, { status: "FAILED", errorMessage });
    await repo.createIntegrationLog({
      productListingId: publication.productListing.id,
      marketplacePublicationId: publication.id,
      action: ACTION,
      status: "FAILED",
      errorCode,
      errorMessage,
    });
    return { failed: true, errorCode };
  }

  private providerReadinessError(publication: MarketplacePublicationPublishContext) {
    if (publication.provider !== "PRINTFUL") return null;
    if (process.env.PRINTFUL_ENABLED !== "true") return "PRINTFUL_NOT_CONFIGURED";
    if (!process.env.PRINTFUL_API_TOKEN) return "PRINTFUL_API_TOKEN_MISSING";
    return null;
  }

  private providerExternalListingId(publication: MarketplacePublicationPublishContext) {
    const prefix = publication.provider === "RASHPOD" ? "rashpod" : publication.provider.toLowerCase();
    return `${prefix}_${publication.marketplace.toLowerCase()}_${publication.id}`;
  }

  private printfulExternalId(value: string) {
    return `rpd_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private publicationRepo() {
    if (
      !this.repo.getMarketplacePublication ||
      !this.repo.updateMarketplacePublication ||
      !this.repo.markListingPublishedIfComplete ||
      !this.repo.createIntegrationLog
    ) {
      throw new Error("Marketplace publication repository methods are not configured");
    }
    return this.repo as Required<
      Pick<WorkerRepository, "getMarketplacePublication" | "getMarketplacePublicationPublishContext" | "updateMarketplacePublication" | "markListingPublishedIfComplete" | "createIntegrationLog">
    > & Pick<WorkerRepository, "ensurePrintfulFileForDesign">;
  }
}

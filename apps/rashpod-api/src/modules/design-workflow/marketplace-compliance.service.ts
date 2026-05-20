import { BadRequestException, Injectable } from "@nestjs/common";
import { MarketplaceKind, MarketplacePublicationStatus, Prisma } from "@prisma/client";

type PublicationLike = {
  id: string;
  marketplace: MarketplaceKind;
  status: MarketplacePublicationStatus;
};

type ListingLike = {
  id: string;
  title?: string | null;
  price?: Prisma.Decimal | number | string | null;
  currency?: string | null;
  mockupAssetIds?: Prisma.JsonValue | null;
  marketplacePublications?: PublicationLike[];
};

@Injectable()
export class MarketplaceComplianceService {
  assertListingReady(listing: ListingLike) {
    this.assertCoreFields(listing);
    const publications = listing.marketplacePublications ?? [];
    const publishable = publications.filter((publication) => publication.status !== MarketplacePublicationStatus.NEEDS_REVIEW);
    if (publishable.length === 0) throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: no publishable marketplace selected");
    for (const publication of publications) this.assertPublicationPolicy(publication);
    return publishable;
  }

  assertPublicationReady(listing: ListingLike, publication: PublicationLike) {
    this.assertCoreFields(listing);
    this.assertPublicationPolicy(publication);
    if (publication.status === MarketplacePublicationStatus.NEEDS_REVIEW) {
      throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: marketplace publication needs manual review");
    }
  }

  private assertCoreFields(listing: ListingLike) {
    if (!listing.title?.trim()) throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: listing title is required");
    if (!listing.currency?.trim()) throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: listing currency is required");
    const price = Number(listing.price);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: listing price must be positive");
    const mockupIds = Array.isArray(listing.mockupAssetIds) ? listing.mockupAssetIds : [];
    if (mockupIds.length === 0) throw new BadRequestException("DESIGN_NOT_APPROVED: publishing requires at least one generated mockup");
  }

  private assertPublicationPolicy(publication: PublicationLike) {
    if (publication.marketplace === MarketplaceKind.AMAZON && publication.status !== MarketplacePublicationStatus.NEEDS_REVIEW) {
      throw new BadRequestException("MARKETPLACE_COMPLIANCE_FAILED: Amazon requires manual review before publishing");
    }
  }
}

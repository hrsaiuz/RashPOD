import { ListingStatus, ListingType, UserRole } from "@prisma/client";
import { ListingsService } from "./listings.service";

describe("ListingsService moderation audit", () => {
  it("records the moderator rejection reason with the status transition", async () => {
    const listing = {
      id: "listing-1",
      designerId: "designer-1",
      type: ListingType.PRODUCT,
      status: ListingStatus.READY_FOR_REVIEW,
      price: 100_000,
      cost: 40_000,
      publishedAt: null,
      metadataJson: null,
    };
    const prisma = {
      commerceListing: {
        findUnique: jest.fn().mockResolvedValue(listing),
        update: jest.fn().mockResolvedValue({ ...listing, status: ListingStatus.REJECTED }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ListingsService(prisma as never, audit as never);

    await service.adminSetStatus(
      { sub: "moderator-1", role: UserRole.MODERATOR } as never,
      listing.id,
      ListingStatus.REJECTED,
      { reason: "  Missing required product details.  " },
    );

    expect(prisma.commerceListing.update).toHaveBeenCalledWith({
      where: { id: listing.id },
      data: {
        status: ListingStatus.REJECTED,
        publishedAt: null,
      },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "moderator-1",
      action: "listing.admin-status.update",
      metadata: {
        beforeStatus: ListingStatus.READY_FOR_REVIEW,
        afterStatus: ListingStatus.REJECTED,
        reason: "Missing required product details.",
        notes: null,
      },
    }));
  });
});

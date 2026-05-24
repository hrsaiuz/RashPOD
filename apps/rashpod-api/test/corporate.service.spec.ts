import { CommercialOfferStatus } from "@prisma/client";
import { CorporateService } from "../src/modules/corporate/corporate.service";

describe("CorporateService.listCommercialOffers", () => {
  it("serializes decimal fields for JSON responses", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "offer_1",
        offerNumber: "OFF-1",
        status: CommercialOfferStatus.DRAFT,
        subtotal: { toString: () => "1000.00" },
        discount: { toString: () => "100.00" },
        total: { toString: () => "900.00" },
        createdAt: new Date(),
        corporateRequest: { id: "req_1", title: "T-shirts", corporateUserId: "u1", status: "OPEN" },
        selectedBid: { id: "bid_1", designerId: "d1", designFee: { toString: () => "500.00" }, status: "SELECTED" },
      },
    ]);
    const service = new CorporateService({ commercialOffer: { findMany } } as never, { log: jest.fn() } as never);

    const rows = await service.listCommercialOffers({});
    expect(findMany).toHaveBeenCalled();
    expect(rows[0].subtotal).toBe("1000.00");
    expect(rows[0].total).toBe("900.00");
    expect(rows[0].selectedBid?.designFee).toBe("500.00");
  });
});

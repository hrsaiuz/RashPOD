import { canCreateFilmListing } from "../src/modules/commercial-rights/rights-policy";

describe("canCreateFilmListing", () => {
  it("rejects when design approved but film sales disabled", () => {
    expect(canCreateFilmListing({ designApproved: true, allowFilmSales: false })).toBe(false);
  });

  it("allows only when both approved and consented", () => {
    expect(canCreateFilmListing({ designApproved: true, allowFilmSales: true })).toBe(true);
  });
});

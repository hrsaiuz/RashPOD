import { validate } from "class-validator";
import { BulkUpdateRightsDto } from "../src/modules/commercial-rights/dto/bulk-update-rights.dto";

describe("BulkUpdateRightsDto", () => {
  it.each([
    "allowProductSales",
    "allowMarketplacePublishing",
    "allowCorporateBidding",
    "filmSalesAction",
    "reason",
  ] as const)("rejects null for %s", async (field) => {
    const dto = Object.assign(new BulkUpdateRightsDto(), {
      designIds: ["550e8400-e29b-41d4-a716-446655440000"],
      [field]: null,
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === field)).toBe(true);
  });
});

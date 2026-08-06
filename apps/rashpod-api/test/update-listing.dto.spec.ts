import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateListingDto } from "../src/modules/listings/dto/update-listing.dto";

describe("UpdateListingDto variants", () => {
  it("accepts typed, positive-price listing variations", async () => {
    const dto = plainToInstance(UpdateListingDto, {
      tags: ["shirt", "designer"],
      variants: [{ id: "black-m", color: "Black", size: "M", price: 100000, enabled: true }],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects empty ids, zero prices, and non-string tags", async () => {
    const dto = plainToInstance(UpdateListingDto, {
      tags: ["shirt", 42],
      variants: [{ id: "", color: "Black", size: "M", price: 0, enabled: true }],
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["tags", "variants"]));
  });

  it("rejects scalar listing metadata", async () => {
    const dto = plainToInstance(UpdateListingDto, { metadataJson: "not-an-object" });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain("metadataJson");
  });
});

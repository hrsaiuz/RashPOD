import { selectPrimaryDesignVersion } from "../src/modules/designs/design-version-selection";

describe("design version selection", () => {
  it("keeps the front artwork as the primary preview when a sleeve was uploaded later", () => {
    const versions = [
      { id: "sleeve", placement: "LEFT_SLEEVE" },
      { id: "front", placement: "FRONT" },
    ];

    expect(selectPrimaryDesignVersion(versions)?.id).toBe("front");
  });

  it("supports placement-agnostic legacy artwork", () => {
    const versions = [{ id: "legacy", placement: null }, { id: "back", placement: "BACK" }];
    expect(selectPrimaryDesignVersion(versions)?.id).toBe("legacy");
  });
});

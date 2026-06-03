import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePrintfulPrintAreas, resolvePrintfulPrintArea } from "./print-area-parser";

describe("printful print area parser", () => {
  it("parses printfile geometry into inch bounds per placement", () => {
    const areas = parsePrintfulPrintAreas(
      {
        variant_printfiles: [
          {
            printfiles: [
              {
                placement: "front",
                dpi: 150,
                width: 1800,
                height: 2400,
                print_area_width: 12,
                print_area_height: 16,
                print_area_left: 0.5,
                print_area_top: 1,
              },
            ],
          },
        ],
      },
      "dtg",
    );

    assert.equal(areas.front?.printAreaWidthIn, 12);
    assert.equal(areas.front?.printAreaHeightIn, 16);
    assert.equal(areas.front?.areaLeftIn, 0.5);
    assert.equal(areas.front?.areaTopIn, 1);
    assert.equal(areas.front?.technique, "dtg");
  });

  it("falls back to defaults when placement is missing from map", () => {
    const fallback = resolvePrintfulPrintArea({}, "front", "dtg");
    assert.equal(fallback.printAreaWidthIn, 12);
    assert.equal(fallback.technique, "dtg");
  });
});

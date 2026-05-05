import { assertUploadMetadataMatches, sanitizeFilename } from "../src/modules/files/file-validation";

describe("file-validation", () => {
  it("sanitizes unsafe filename chars", () => {
    expect(sanitizeFilename("../../evil file?.png")).toBe(".._.._evil_file_.png");
  });

  it("accepts matching upload metadata", () => {
    expect(() =>
      assertUploadMetadataMatches({
        expectedSizeBytes: 100,
        expectedMimeType: "image/png",
        expectedChecksum: "abc",
        uploadedSizeBytes: 100,
        uploadedMimeType: "image/png",
        uploadedChecksum: "abc",
      }),
    ).not.toThrow();
  });

  it("throws on mismatched size", () => {
    expect(() =>
      assertUploadMetadataMatches({
        expectedSizeBytes: 100,
        expectedMimeType: "image/png",
        uploadedSizeBytes: 101,
        uploadedMimeType: "image/png",
      }),
    ).toThrow("Uploaded size does not match requested size");
  });
});

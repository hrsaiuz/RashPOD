import { AssetPurpose } from "@prisma/client";
import {
  assertAssetUploadAllowed,
  DESIGN_ORIGINAL_MAX_BYTES,
  resolveAssetUploadPolicy,
  resolveUploadMimeForAsset,
} from "../src/modules/files/asset-upload-policy";
import { assertUploadMetadataMatches, normalizeMimeType } from "../src/modules/files/file-validation";

describe("DESIGN_ORIGINAL upload policy", () => {
  it("allows design originals up to 50 MiB", () => {
    const policy = resolveAssetUploadPolicy(AssetPurpose.DESIGN_ORIGINAL);
    expect(policy.maxSizeBytes).toBe(DESIGN_ORIGINAL_MAX_BYTES);
    expect(DESIGN_ORIGINAL_MAX_BYTES).toBe(50 * 1024 * 1024);
    expect(() =>
      assertAssetUploadAllowed({
        purpose: AssetPurpose.DESIGN_ORIGINAL,
        filename: "large.png",
        mimeType: "image/png",
        sizeBytes: DESIGN_ORIGINAL_MAX_BYTES,
      }),
    ).not.toThrow();
  });

  it("rejects design originals above 50 MiB", () => {
    expect(() =>
      assertAssetUploadAllowed({
        purpose: AssetPurpose.DESIGN_ORIGINAL,
        filename: "too-large.png",
        mimeType: "image/png",
        sizeBytes: DESIGN_ORIGINAL_MAX_BYTES + 1,
      }),
    ).toThrow("File exceeds DESIGN_ORIGINAL size limit");
  });

  it("normalizes browser jpeg aliases for design originals", () => {
    expect(
      resolveUploadMimeForAsset({
        purpose: AssetPurpose.DESIGN_ORIGINAL,
        filename: "photo.jpg",
        mimeType: "image/pjpeg",
      }),
    ).toBe("image/jpeg");
    expect(
      assertAssetUploadAllowed({
        purpose: AssetPurpose.DESIGN_ORIGINAL,
        filename: "photo.jpg",
        mimeType: "image/pjpeg",
        sizeBytes: 1000,
      }).resolvedMimeType,
    ).toBe("image/jpeg");
  });
});

describe("upload metadata validation", () => {
  it("treats image/jpg as image/jpeg", () => {
    expect(normalizeMimeType("image/jpg")).toBe("image/jpeg");
    expect(() =>
      assertUploadMetadataMatches({
        expectedSizeBytes: 100,
        expectedMimeType: "image/jpeg",
        uploadedSizeBytes: 100,
        uploadedMimeType: "image/jpg",
      }),
    ).not.toThrow();
  });

  it("accepts octet-stream fallback when declared consistently", () => {
    expect(() =>
      assertUploadMetadataMatches({
        expectedSizeBytes: 100,
        expectedMimeType: "application/octet-stream",
        uploadedSizeBytes: 100,
        uploadedMimeType: "application/octet-stream",
      }),
    ).not.toThrow();
  });
});

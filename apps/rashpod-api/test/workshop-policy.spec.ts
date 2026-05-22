import { BadRequestException } from "@nestjs/common";
import { AssetAccessPolicy, AssetPurpose } from "@prisma/client";
import { permissions } from "../src/common/auth/permissions";
import { assertAssetUploadAllowed, buildAssetObjectKey, resolveAssetUploadPolicy } from "../src/modules/files/asset-upload-policy";

describe("Workshop mobile policy", () => {
  it("grants production operators the focused mobile permissions they need", () => {
    const required = [
      "workshop:read",
      "workshop:scan",
      "workshop:update-status",
      "workshop:assign-self",
      "workshop:download-production-file",
      "workshop:qc",
      "workshop:qc-evidence-upload",
      "workshop:pack",
      "workshop:pickup",
      "workshop:delivery",
      "workshop:report-issue",
    ] as const;

    for (const permission of required) {
      expect(permissions[permission]).toContain("PRODUCTION_STAFF");
      expect(permissions[permission]).toContain("OPERATIONS_MANAGER");
    }
  });

  it("keeps operator assignment admin-only when assigning other people", () => {
    expect(permissions["workshop:assign-others"]).toEqual(["ADMIN", "SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  });

  it("stores workshop QC evidence as private internal raster uploads", () => {
    const policy = resolveAssetUploadPolicy(AssetPurpose.WORKSHOP_QC_EVIDENCE);

    expect(policy.accessPolicy).toBe(AssetAccessPolicy.INTERNAL_ONLY);
    expect(policy.bucketKind).toBe("private");
    expect(policy.allowedMimeTypes).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(policy.maxSizeBytes).toBe(20_000_000);
  });

  it("rejects unsafe workshop QC evidence upload types and oversized files", () => {
    expect(() => assertAssetUploadAllowed({ purpose: AssetPurpose.WORKSHOP_QC_EVIDENCE, filename: "proof.svg", mimeType: "image/svg+xml", sizeBytes: 1000 })).toThrow(BadRequestException);
    expect(() => assertAssetUploadAllowed({ purpose: AssetPurpose.WORKSHOP_QC_EVIDENCE, filename: "proof.jpg", mimeType: "image/jpeg", sizeBytes: 20_000_001 })).toThrow(BadRequestException);
  });

  it("builds non-customer-identifying evidence object keys", () => {
    const key = buildAssetObjectKey({ ownerId: "operator-1", assetId: "asset-1", purpose: AssetPurpose.WORKSHOP_QC_EVIDENCE, extension: "jpg" });

    expect(key).toBe("workshop/qc-evidence/operator-1/asset-1.jpg");
    expect(key).not.toContain("order");
    expect(key).not.toContain("customer");
  });
});

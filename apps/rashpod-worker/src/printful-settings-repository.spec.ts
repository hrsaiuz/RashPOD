import { PrismaAssetRepository } from "./prisma-asset-repository";

describe("PrismaAssetRepository Printful settings", () => {
  const originalRuntimeFlag = process.env.PRINTFUL_ENABLED;

  afterEach(() => {
    if (originalRuntimeFlag == null) delete process.env.PRINTFUL_ENABLED;
    else process.env.PRINTFUL_ENABLED = originalRuntimeFlag;
  });

  it("does not let the legacy runtime flag override an administrator disabling Printful", async () => {
    process.env.PRINTFUL_ENABLED = "true";
    const repository = new PrismaAssetRepository();
    (repository as any).prisma = {
      platformSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: { enabled: false, catalogAllowlist: [] } }),
      },
    };

    await expect(repository.getPrintfulSettings()).resolves.toEqual({
      enabled: false,
      defaultStoreId: null,
      catalogAllowlist: [],
    });
  });
});

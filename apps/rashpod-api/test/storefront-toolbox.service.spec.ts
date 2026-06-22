import { StorefrontToolboxService } from "../src/modules/storefront-toolbox/storefront-toolbox.service";

describe("StorefrontToolboxService", () => {
  const originalFlag = process.env.BACKGROUND_REMOVER_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.BACKGROUND_REMOVER_ENABLED;
    else process.env.BACKGROUND_REMOVER_ENABLED = originalFlag;
  });

  it("returns a configuration error when the remover is disabled", async () => {
    delete process.env.BACKGROUND_REMOVER_ENABLED;
    const service = new StorefrontToolboxService();

    await expect(service.removeBackground([{ originalname: "sample.png" }] as any)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: "BACKGROUND_REMOVER_NOT_CONFIGURED",
      }),
    });
  });
});

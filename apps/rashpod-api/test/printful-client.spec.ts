import { Test } from "@nestjs/testing";
import { PrismaService } from "../src/prisma/prisma.service";
import { PrintfulClient } from "../src/modules/printful/printful.client";

describe("PrintfulClient readiness", () => {
  const originalEnabled = process.env.PRINTFUL_ENABLED;
  const originalToken = process.env.PRINTFUL_API_TOKEN;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnabled == null) delete process.env.PRINTFUL_ENABLED;
    else process.env.PRINTFUL_ENABLED = originalEnabled;
    if (originalToken == null) delete process.env.PRINTFUL_API_TOKEN;
    else process.env.PRINTFUL_API_TOKEN = originalToken;
  });

  async function createClient(enabled: boolean, token = "test-token") {
    process.env.PRINTFUL_ENABLED = enabled ? "false" : "true";
    if (token) process.env.PRINTFUL_API_TOKEN = token;
    else delete process.env.PRINTFUL_API_TOKEN;

    const prisma = {
      platformSetting: {
        findUnique: jest.fn().mockResolvedValue({ value: { enabled } }),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrintfulClient,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    return { client: moduleRef.get(PrintfulClient), prisma };
  }

  it("blocks requests when the persisted setting is disabled, even if the legacy flag is true", async () => {
    const { client, prisma } = await createClient(false);
    const transport = jest.spyOn((client as any).client, "request");

    await expect(client.listCategories()).rejects.toThrow("PRINTFUL_NOT_CONFIGURED");

    expect(prisma.platformSetting.findUnique).toHaveBeenCalledWith({
      where: { key: "integrations.printful" },
      select: { value: true },
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("allows requests when the persisted setting is enabled, even if the legacy flag is false", async () => {
    const { client } = await createClient(true);
    const transport = jest.spyOn((client as any).client, "request").mockResolvedValue({ result: [] });

    await expect(client.listCategories()).resolves.toEqual({ result: [] });
    expect(transport).toHaveBeenCalledWith({ path: "/categories" });
  });

  it("still requires an API token after the persisted setting is enabled", async () => {
    const { client } = await createClient(true, "");
    const transport = jest.spyOn((client as any).client, "request");

    await expect(client.listCategories()).rejects.toThrow("PRINTFUL_API_TOKEN_MISSING");
    expect(transport).not.toHaveBeenCalled();
  });
});

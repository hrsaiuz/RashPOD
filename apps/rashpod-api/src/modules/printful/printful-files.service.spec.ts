import { PrintfulFilesService } from "./printful-files.service";

describe("PrintfulFilesService placement artwork selection", () => {
  function setup(versions: Array<{ id: string; fileKey: string; placement: string | null }>) {
    const prisma = {
      designAsset: { findUnique: jest.fn().mockResolvedValue({ id: "design_1", versions }) },
      printfulFileMapping: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "mapping_1" }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mapping_1", ...data })),
      },
    };
    const storage = {
      createSignedReadUrl: jest.fn().mockResolvedValue("https://signed.example/design.png"),
    };
    const client = {
      uploadFileFromUrl: jest.fn().mockResolvedValue({ result: { id: 123, url: "https://printful.example/file.png" } }),
    };
    return {
      service: new PrintfulFilesService(prisma as any, storage as any, client as any),
      storage,
      client,
    };
  }

  it("does not upload artwork from another explicit placement", async () => {
    const { service, storage, client } = setup([
      { id: "back_version", fileKey: "designs/back.png", placement: "BACK" },
    ]);

    await expect(service.ensurePrintfulFileForDesign("design_1", "front")).rejects.toThrow("DESIGN_FILE_MISSING");
    expect(storage.createSignedReadUrl).not.toHaveBeenCalled();
    expect(client.uploadFileFromUrl).not.toHaveBeenCalled();
  });

  it("uses legacy default artwork when the requested placement has no exact file", async () => {
    const { service, storage, client } = setup([
      { id: "back_version", fileKey: "designs/back.png", placement: "BACK" },
      { id: "default_version", fileKey: "designs/default.png", placement: null },
    ]);

    await expect(service.ensurePrintfulFileForDesign("design_1", "front")).resolves.toEqual(
      expect.objectContaining({ status: "READY", printfulFileId: "123" }),
    );
    expect(storage.createSignedReadUrl).toHaveBeenCalledWith({
      objectKey: "designs/default.png",
      expiresSeconds: 60 * 60,
    });
    expect(client.uploadFileFromUrl).toHaveBeenCalledWith("https://signed.example/design.png");
  });
});

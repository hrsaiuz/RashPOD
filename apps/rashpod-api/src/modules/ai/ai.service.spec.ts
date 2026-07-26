import { ServiceUnavailableException } from "@nestjs/common";
import { AiService } from "./ai.service";

describe("AiService translation failures", () => {
  it("does not disguise an unavailable provider as a translation", async () => {
    const service = new AiService(
      {} as never,
      {
        getAiSettings: jest.fn().mockResolvedValue({
          allowedLanguages: ["ru", "en", "uz"],
        }),
      } as never,
      {} as never,
    );
    jest.spyOn(service as any, "runOpenAiText").mockResolvedValue(null);

    await expect(
      service.translate("designer-1", {
        text: "O‘zbekcha hikoya",
        targetLanguage: "ru",
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

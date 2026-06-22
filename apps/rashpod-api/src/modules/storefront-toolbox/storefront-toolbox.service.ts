import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";

type PlaceholderResult = {
  inputName: string;
  status: "done" | "error";
  outputName?: string;
  mimeType?: string;
  base64Data?: string;
  errorCode?: string;
  errorMessage?: string;
};

@Injectable()
export class StorefrontToolboxService {
  async removeBackground(files: Array<{ originalname: string }>): Promise<{ results: PlaceholderResult[] }> {
    if (!files.length) {
      throw new BadRequestException({
        code: "TOOLBOX_NO_FILES",
        message: "Upload at least one image to process.",
      });
    }

    if (process.env.BACKGROUND_REMOVER_ENABLED !== "true") {
      throw new ServiceUnavailableException({
        code: "BACKGROUND_REMOVER_NOT_CONFIGURED",
        message: "Background remover is not configured yet. Ask support or try again after the processing service is enabled.",
      });
    }

    return {
      results: files.map((file) => ({
        inputName: file.originalname,
        status: "error",
        errorCode: "BACKGROUND_REMOVER_NOT_IMPLEMENTED",
        errorMessage: "Background remover service integration is enabled but not implemented yet.",
      })),
    };
  }
}

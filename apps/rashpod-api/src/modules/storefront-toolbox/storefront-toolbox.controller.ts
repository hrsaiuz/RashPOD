import { Controller, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { StorefrontToolboxService } from "./storefront-toolbox.service";

const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

@Controller("storefront/toolbox")
export class StorefrontToolboxController {
  constructor(private readonly toolbox: StorefrontToolboxService) {}

  @Post("background-remove")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      storage: memoryStorage(),
      limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  removeBackground(
    @UploadedFiles()
    files: Express.Multer.File[] = [],
  ) {
    return this.toolbox.removeBackground(files);
  }
}

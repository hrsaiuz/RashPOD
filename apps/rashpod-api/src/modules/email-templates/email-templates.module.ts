import { Global, Module } from "@nestjs/common";
import { EmailTemplatesService } from "./email-templates.service";

@Global()
@Module({
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}

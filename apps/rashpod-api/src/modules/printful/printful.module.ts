import { Module } from "@nestjs/common";
import { PrintfulClient } from "./printful.client";
import { PrintfulMockupService } from "./printful-mockup.service";

@Module({
  providers: [PrintfulClient, PrintfulMockupService],
  exports: [PrintfulClient, PrintfulMockupService],
})
export class PrintfulModule {}

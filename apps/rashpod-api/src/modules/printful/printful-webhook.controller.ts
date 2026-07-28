import { Controller, Headers, Post, Req } from "@nestjs/common";
import { PrintfulWebhookService } from "./printful-webhook.service";

@Controller("webhooks/printful")
export class PrintfulWebhookController {
  constructor(private readonly webhooks: PrintfulWebhookService) {}

  @Post()
  handle(
    @Req() request: { body: Buffer },
    @Headers("x-pf-webhook-signature") signature?: string,
    @Headers("x-pf-webhook-public-key") publicKey?: string,
  ) {
    return this.webhooks.handleSignedWebhook(request.body, signature, publicKey);
  }
}

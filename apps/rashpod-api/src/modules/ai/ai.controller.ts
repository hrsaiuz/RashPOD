import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("ai:assist")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("listing-copy")
  listingCopy(
    @CurrentUser() user: RequestUser,
    @Body() body: { titleHint?: string; descriptionHint?: string; tagsHint?: string[] },
  ) {
    return this.ai.listingCopy(user.sub, body);
  }

  @Post("translate")
  translate(@CurrentUser() user: RequestUser, @Body() body: { text: string; targetLanguage: "uz" | "ru" | "en" }) {
    return this.ai.translate(user.sub, body);
  }

  @Post("moderation-assist")
  moderationAssist(@CurrentUser() user: RequestUser, @Body() body: { title?: string; description?: string }) {
    return this.ai.moderationAssist(user.sub, body);
  }

  @Post("film-readiness")
  filmReadiness(
    @CurrentUser() user: RequestUser,
    @Body() body: { widthPx: number; heightPx: number; hasTransparency: boolean },
  ) {
    return this.ai.filmReadiness(user.sub, body);
  }

  @Post("corporate-offer-draft")
  corporateOfferDraft(@CurrentUser() user: RequestUser, @Body() body: { brief: string; quantity?: number; budget?: number }) {
    return this.ai.corporateOfferDraft(user.sub, body);
  }
}

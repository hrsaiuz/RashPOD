import { Controller, Get, Param, Query } from "@nestjs/common";
import { DesignStoriesService } from "./design-stories.service";

@Controller("shop/stories")
export class DesignStoriesController {
  constructor(private readonly stories: DesignStoriesService) {}

  @Get(":slug")
  bySlug(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.stories.getPublishedStoryBySlug(slug, locale);
  }
}

import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

export class DesignStoryLocaleTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;
}

export class DesignStoryMediaRefsDto {
  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  uz?: string;

  @IsOptional()
  @IsString()
  ru?: string;
}

export class DesignStoryTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryLocaleTextDto)
  uz?: DesignStoryLocaleTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryLocaleTextDto)
  ru?: DesignStoryLocaleTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryLocaleTextDto)
  en?: DesignStoryLocaleTextDto;
}

export class UpsertDesignStoryDraftDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(160)
  slug!: string;

  @IsOptional()
  @IsString()
  @IsIn(["uz", "ru", "en"])
  sourceLocale?: "uz" | "ru" | "en";

  @IsOptional()
  @IsString()
  coverImageFileId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryLocaleTextDto)
  source?: DesignStoryLocaleTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryTranslationsDto)
  translations?: DesignStoryTranslationsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryMediaRefsDto)
  audioFileIds?: DesignStoryMediaRefsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryMediaRefsDto)
  videoFileIds?: DesignStoryMediaRefsDto;
}

export class AttachDesignStoryMediaDto {
  @IsOptional()
  @IsString()
  coverImageFileId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryMediaRefsDto)
  audioFileIds?: DesignStoryMediaRefsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignStoryMediaRefsDto)
  videoFileIds?: DesignStoryMediaRefsDto;
}

export class RejectDesignStoryDto {
  @IsString()
  @MaxLength(2000)
  notes!: string;
}

export class DesignStoryQueryDto {
  @IsOptional()
  @IsString()
  locale?: string;
}

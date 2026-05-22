import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { NotificationChannel } from "@prisma/client";

export class ListNotificationsDto {
  @IsOptional()
  @IsIn(["true", "false"])
  unreadOnly?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  telegram?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  telegramChatId?: string;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  mutedChannels?: NotificationChannel[];
}

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  @MaxLength(80)
  type!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  templateKey?: string;
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";
import { CurrentUser, RequestUser } from "../../common/auth/current-user.decorator";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionGuard } from "../../common/auth/permission.guard";
import { RequirePermission } from "../../common/auth/permission.decorator";
import { CreateNotificationDto, ListNotificationsDto, UpdateNotificationPreferencesDto } from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("notifications")
  @RequirePermission("notifications:read-own")
  listMine(@CurrentUser() user: RequestUser, @Query() query: ListNotificationsDto) {
    return this.notifications.listForUser(user.sub, query);
  }

  @Get("notifications/unread-count")
  @RequirePermission("notifications:read-own")
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notifications.unreadCount(user.sub);
  }

  @Patch("notifications/:id/read")
  @RequirePermission("notifications:update-own")
  markRead(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user.sub, id);
  }

  @Post("notifications/mark-all-read")
  @RequirePermission("notifications:update-own")
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Get("notifications/preferences")
  @RequirePermission("notifications:preferences-own")
  preferences(@CurrentUser() user: RequestUser) {
    return this.notifications.preferences(user.sub);
  }

  @Patch("notifications/preferences")
  @RequirePermission("notifications:preferences-own")
  updatePreferences(@CurrentUser() user: RequestUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notifications.updatePreferences(user.sub, dto);
  }

  @Post("admin/notifications")
  @RequirePermission("notifications:send")
  adminCreate(@CurrentUser() user: RequestUser, @Body() dto: CreateNotificationDto) {
    return this.notifications.adminCreate(user.sub, dto);
  }

  @Get("admin/notifications/deliveries")
  @RequirePermission("notifications:deliveries-read")
  deliveries(@Query("status") status?: NotificationDeliveryStatus, @Query("channel") channel?: NotificationChannel) {
    return this.notifications.listDeliveries({ status, channel });
  }
}

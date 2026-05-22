import { NotificationChannel, NotificationDeliveryStatus, SupportMessageVisibility, SupportRequestStatus, UserRole } from "@prisma/client";
import { NotificationsService } from "../src/modules/communications/notifications.service";
import { SupportService } from "../src/modules/communications/support.service";

function makeNotificationService() {
  const deliveries: any[] = [];
  const notifications: any[] = [];
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", email: "u@example.test", preferences: { notificationJson: { email: true, telegram: true, telegramChatId: "123" } } }) },
    userPreferences: { findUnique: jest.fn(), upsert: jest.fn() },
    notification: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(notifications.find((n) => n.idempotencyKey === where.idempotencyKey || n.id === where.id) ?? null)),
      findUniqueOrThrow: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({ ...notifications.find((n) => n.id === where.id), deliveries })),
      create: jest.fn().mockImplementation(({ data }: any) => { const row = { id: "notification-1", createdAt: new Date(), ...data }; notifications.push(row); return Promise.resolve(row); }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationDelivery: {
      create: jest.fn().mockImplementation(({ data }: any) => { const row = { id: `delivery-${deliveries.length + 1}`, ...data }; deliveries.push(row); return Promise.resolve(row); }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const jobs = { enqueue: jest.fn().mockResolvedValue({ accepted: true }) };
  return { service: new NotificationsService(prisma, audit as any, jobs as any), prisma, audit, jobs, deliveries };
}

function makeSupportService() {
  const notifications = { notifyUser: jest.fn().mockResolvedValue({ id: "n1" }) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const prisma: any = {
    supportRequest: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: "ticket-1", requesterId: "customer-1", requester: { id: "customer-1", email: "c@example.test" }, assignedToId: "support-1", status: SupportRequestStatus.OPEN, firstResponseAt: null, subject: "Help", category: "payment" }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    supportMessage: { create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "message-1", ...data })) },
  };
  return { service: new SupportService(prisma, audit as any, notifications as any), prisma, audit, notifications };
}

describe("NotificationsService", () => {
  it("creates in-app, email, and telegram deliveries with queued worker jobs", async () => {
    const { service, deliveries, jobs } = makeNotificationService();
    await service.notifyUser({ userId: "user-1", type: "support.ticket.reply", title: "Reply", body: "Support replied", idempotencyKey: "idem-1" });

    expect(deliveries).toHaveLength(3);
    expect(deliveries.find((d) => d.channel === NotificationChannel.IN_APP)).toMatchObject({ status: NotificationDeliveryStatus.DELIVERED });
    expect(jobs.enqueue).toHaveBeenCalledWith("SEND_EMAIL", expect.objectContaining({ notificationDeliveryId: "delivery-2" }));
    expect(jobs.enqueue).toHaveBeenCalledWith("TELEGRAM_SEND", expect.objectContaining({ notificationDeliveryId: "delivery-3" }));
  });

  it("returns an existing notification for a repeated idempotency key", async () => {
    const { service, prisma } = makeNotificationService();
    await service.notifyUser({ userId: "user-1", type: "x", title: "First", body: "Body", idempotencyKey: "same" });
    await service.notifyUser({ userId: "user-1", type: "x", title: "Second", body: "Body", idempotencyKey: "same" });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });
});

describe("SupportService", () => {
  it("adds staff replies, updates ticket state, and notifies the requester", async () => {
    const { service, prisma, notifications } = makeSupportService();
    const message = await service.addMessage("support-1", UserRole.SUPPORT_STAFF, "ticket-1", { body: "We are checking it." });

    expect(message).toMatchObject({ supportRequestId: "ticket-1", visibility: SupportMessageVisibility.PUBLIC });
    expect(prisma.supportRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: SupportRequestStatus.WAITING_FOR_USER }) }));
    expect(notifications.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "customer-1", type: "support.ticket.reply" }));
  });
});

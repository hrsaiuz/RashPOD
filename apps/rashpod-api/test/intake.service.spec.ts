import { IntakeStatus } from "@prisma/client";
import { IntakeService } from "../src/modules/intake/intake.service";

describe("IntakeService", () => {
  const prisma = {
    designerApplication: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    contactMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    customOrderRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };
  const files = {
    createUploadUrl: jest.fn(),
    completeUpload: jest.fn(),
  };
  const service = new IntakeService(prisma as any, audit as any, files as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates designer applications without approving anything automatically", async () => {
    prisma.designerApplication.create.mockResolvedValue({ id: "app_1", status: IntakeStatus.NEW });

    const result = await service.createDesignerApplication({
      firstName: "Hadis",
      lastName: "Samadian",
      email: "HADIS@example.com",
      confirmations: { ownWork: true },
    });

    expect(result).toEqual({ id: "app_1", status: IntakeStatus.NEW });
    expect(prisma.designerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "hadis@example.com",
          firstName: "Hadis",
          lastName: "Samadian",
        }),
      }),
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("creates contact messages for admin review", async () => {
    prisma.contactMessage.create.mockResolvedValue({ id: "msg_1", status: IntakeStatus.NEW });

    await service.createContactMessage({
      firstName: "Customer",
      email: "customer@example.com",
      subject: "Order support",
      message: "Need help",
    });

    expect(prisma.contactMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subject: "Order support" }),
      }),
    );
  });

  it("updates intake status and writes an audit log", async () => {
    prisma.customOrderRequest.update.mockResolvedValue({ id: "req_1", status: IntakeStatus.CONTACTED });

    await service.update("custom-order-requests", "req_1", { status: IntakeStatus.CONTACTED, reviewNotes: "Called" }, "admin_1");

    expect(prisma.customOrderRequest.update).toHaveBeenCalledWith({
      where: { id: "req_1" },
      data: { status: IntakeStatus.CONTACTED, reviewNotes: "Called" },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin_1",
      action: "intake.custom-order-requests.update",
      entityId: "req_1",
    }));
  });
});

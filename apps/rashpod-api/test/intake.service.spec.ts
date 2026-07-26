import { BadRequestException } from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import { IntakeService } from "../src/modules/intake/intake.service";

describe("IntakeService", () => {
  const prisma = {
    designerApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
    fileAsset: {
      findMany: jest.fn(),
    },
  };
  const audit = { log: jest.fn() };
  const files = {
    createUploadUrl: jest.fn(),
    completeUpload: jest.fn(),
  };
  const invitations = { create: jest.fn(), notifyApplicationRejected: jest.fn() };
  const service = new IntakeService(prisma as any, audit as any, files as any, invitations as any);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTAKE_SYSTEM_OWNER_ID = "intake_owner";
    prisma.designerApplication.findFirst.mockResolvedValue(null);
    prisma.fileAsset.findMany.mockImplementation(async ({ where }: any) =>
      where.id.in.map((id: string) => ({ id })),
    );
  });

  it("creates designer applications without approving anything automatically", async () => {
    const submittedAt = new Date("2026-07-26T12:00:00Z");
    prisma.designerApplication.create.mockResolvedValue({ id: "app_1", status: IntakeStatus.NEW, submittedAt });

    const result = await service.createDesignerApplication({
      firstName: "Hadis",
      lastName: "Samadian",
      email: "HADIS@example.com",
      displayName: "Hadis",
      country: "Uzbekistan",
      city: "Tashkent",
      designCategories: ["Illustration"],
      shortBio: "Independent illustrator",
      confirmations: { ownWork: true, noProhibitedContent: true, noApprovalGuarantee: true, terms: true },
      portfolioFiles: [{ fileId: "portfolio_1" }],
      identityFiles: [{ fileId: "identity_1" }],
      selfieFiles: [{ fileId: "selfie_1" }],
    });

    expect(result).toEqual({ id: "app_1", status: IntakeStatus.NEW, submittedAt });
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

  it("approves an application by creating and linking one activation invitation", async () => {
    prisma.designerApplication.findUnique.mockResolvedValue({
      id: "app_1",
      email: "artist@example.com",
      firstName: "Artist",
      lastName: "One",
      displayName: "Artist",
      tenantId: "tenant_1",
      status: IntakeStatus.IN_REVIEW,
      invitationId: null,
    });
    invitations.create.mockResolvedValue({ id: "invite_1" });
    prisma.designerApplication.update.mockResolvedValue({
      id: "app_1",
      status: IntakeStatus.APPROVED,
      invitationId: "invite_1",
    });

    const result = await service.update(
      "designer-applications",
      "app_1",
      { status: IntakeStatus.APPROVED, reviewNotes: "Approved portfolio" },
      "admin_1",
    );

    expect(invitations.create).toHaveBeenCalledTimes(1);
    expect(prisma.designerApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: IntakeStatus.APPROVED,
        invitationId: "invite_1",
        reviewedById: "admin_1",
      }),
    }));
    expect(result).toEqual(expect.objectContaining({ invitationId: "invite_1" }));
  });

  it("requires a reason before rejecting and sends applicant feedback", async () => {
    prisma.designerApplication.findUnique.mockResolvedValue({
      id: "app_2",
      email: "artist@example.com",
      firstName: "Artist",
      lastName: "Two",
      displayName: "Artist",
      status: IntakeStatus.IN_REVIEW,
      invitationId: null,
    });

    await expect(
      service.update("designer-applications", "app_2", { status: IntakeStatus.REJECTED }, "admin_1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.designerApplication.update.mockResolvedValue({ id: "app_2", status: IntakeStatus.REJECTED });
    await service.update(
      "designer-applications",
      "app_2",
      { status: IntakeStatus.REJECTED, reviewNotes: "Portfolio does not show original work." },
      "admin_1",
    );

    expect(invitations.notifyApplicationRejected).toHaveBeenCalledWith(expect.objectContaining({
      email: "artist@example.com",
      reason: "Portfolio does not show original work.",
    }));
  });
});

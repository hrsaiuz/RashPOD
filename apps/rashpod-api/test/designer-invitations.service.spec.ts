import { BadRequestException } from "@nestjs/common";
import { DesignerInvitationStatus, UserRole } from "@prisma/client";
import { officialSocialLinks } from "@rashpod/config";
import { DesignerInvitationsService } from "../src/modules/designer-invitations/designer-invitations.service";
import { EmailTemplatesService } from "../src/modules/email-templates/email-templates.service";

describe("DesignerInvitationsService", () => {
  const admin = { sub: "admin-1", email: "admin@rashpod.uz", role: UserRole.ADMIN, tenantId: "tenant-1" };
  const inviter = { displayName: "RashPOD Admin" };
  const base = { id: "invite-1", tenantId: "tenant-1", email: "artist@example.com", displayName: "Artist", locale: "en", personalMessage: null, tokenHash: "hash", status: DesignerInvitationStatus.PENDING, invitedById: "admin-1", acceptedById: null, expiresAt: new Date(Date.now() + 86_400_000), acceptedAt: null, revokedAt: null, lastSentAt: new Date(), createdAt: new Date(), updatedAt: new Date(), invitedBy: inviter };

  function setup() {
    let state: any = { ...base };
    const prisma: any = {
      designerInvitation: {
        updateMany: jest.fn(async (args: any) => {
          if (args.where.id && state.status === DesignerInvitationStatus.PENDING) { state = { ...state, ...args.data }; return { count: 1 }; }
          if (!args.where.id) return { count: 0 };
          return { count: 0 };
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }: any) => { state = { ...base, ...data, tokenHash: data.tokenHash }; return state; }),
        findUnique: jest.fn(async ({ where }: any) => where.id || where.tokenHash ? { ...state, invitedBy: inviter } : null),
        update: jest.fn(async ({ data }: any) => { state = { ...state, ...data }; return state; }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: "tenant-1" }) },
      $transaction: jest.fn(async (callback: any) => callback({
        designerInvitation: prisma.designerInvitation,
        user: { create: jest.fn().mockResolvedValue({ id: "designer-1", email: base.email, displayName: base.displayName }) },
        tenantMember: { upsert: jest.fn().mockResolvedValue({}) },
      })),
    };
    const audit: any = { log: jest.fn().mockResolvedValue({}) };
    const jobs: any = { enqueue: jest.fn().mockResolvedValue({ accepted: true }) };
    return { service: new DesignerInvitationsService(prisma, audit, jobs, new EmailTemplatesService()), prisma, audit, jobs, state: () => state };
  }

  it("creates a hashed-token invitation and queues the branded email", async () => {
    const { service, prisma, jobs } = setup();
    const result = await service.create(admin as any, { email: "Artist@Example.com", locale: "en" });
    const data = prisma.designerInvitation.create.mock.calls[0][0].data;
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.invitationUrl).toContain("/en/designer-invitation/");
    expect(result.invitationUrl).not.toContain(data.tokenHash);
    expect(jobs.enqueue).toHaveBeenCalledWith("SEND_EMAIL", expect.objectContaining({ to: "artist@example.com", html: expect.stringContaining(officialSocialLinks.instagram) }));
  });

  it("accepts a valid invitation once and creates no duplicate existing account", async () => {
    const { service, prisma } = setup();
    const created = await service.create(admin as any, { email: base.email, locale: "en" });
    const token = created.invitationUrl.split("/").pop()!;
    const result = await service.acceptNew(token, { password: "SecurePass123!", displayName: "Artist", agreementsAccepted: true });
    expect(result.accepted).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    await expect(service.acceptNew(token, { password: "SecurePass123!", agreementsAccepted: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("routes an existing account through authenticated confirmation", async () => {
    const { service, prisma } = setup();
    const created = await service.create(admin as any, { email: base.email, locale: "en" });
    prisma.user.findUnique.mockResolvedValueOnce({ id: "existing" });
    await expect(service.acceptNew(created.invitationUrl.split("/").pop()!, { password: "SecurePass123!", agreementsAccepted: true })).resolves.toEqual({ requiresAuthentication: true, email: base.email });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects revoked and expired invitations", async () => {
    const { service, prisma } = setup();
    prisma.designerInvitation.findUnique.mockResolvedValueOnce({ ...base, status: DesignerInvitationStatus.REVOKED, invitedBy: inviter });
    await expect(service.acceptNew("x".repeat(40), { password: "SecurePass123!", agreementsAccepted: true })).rejects.toBeInstanceOf(BadRequestException);
    prisma.designerInvitation.findUnique.mockResolvedValueOnce({ ...base, expiresAt: new Date(Date.now() - 1000), invitedBy: inviter });
    await expect(service.acceptNew("y".repeat(40), { password: "SecurePass123!", agreementsAccepted: true })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("designer invitation email", () => {
  it("contains official social links, CTA, fallback URL, and expiry", () => {
    const rendered = new EmailTemplatesService().designerInvitation({ recipientName: "Artist", inviterName: "Admin", invitationUrl: "https://rashpod.uz/en/designer-invitation/token", expiresAt: new Date("2026-07-20T10:00:00Z"), locale: "en" });
    expect(rendered.html).toContain(officialSocialLinks.instagram);
    expect(rendered.html).toContain(officialSocialLinks.telegram);
    expect(rendered.html).toContain("Accept invitation");
    expect(rendered.text).toContain("https://rashpod.uz/en/designer-invitation/token");
  });
});

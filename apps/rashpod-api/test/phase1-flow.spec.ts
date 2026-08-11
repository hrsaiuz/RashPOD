import { JwtService } from "@nestjs/jwt";
import { PlacementKind } from "@prisma/client";
import { AuthService } from "../src/modules/auth/auth.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { DesignsService } from "../src/modules/designs/designs.service";
import { FilesService } from "../src/modules/files/files.service";
import { ModerationService } from "../src/modules/moderation/moderation.service";
import { StorageService } from "../src/modules/files/storage.service";
import { createFakePrisma } from "./helpers/fake-prisma";

describe("Phase1 flow integration-style", () => {
  it("runs upload -> version -> submit -> moderation -> history", async () => {
    const prisma = createFakePrisma();
    const jwt = new JwtService();
    const audit = new AuditService(prisma as any);
    const mailer = { send: async () => ({ ok: false, error: "test" }), isConfigured: () => false } as any;
    const emailTemplates = {
      welcomeDesigner: () => ({ subject: "", html: "", text: "" }),
      welcomeCustomer: () => ({ subject: "", html: "", text: "" }),
      emailOtp: () => ({ subject: "", html: "", text: "" }),
      emailVerification: () => ({ subject: "", html: "", text: "" }),
      passwordReset: () => ({ subject: "", html: "", text: "" }),
    } as any;
    const auth = new AuthService(prisma as any, jwt, audit, mailer, emailTemplates);
    const storage = { createSignedReadUrl: jest.fn().mockResolvedValue("https://storage.example/preview.png") } as any;
    const designs = new DesignsService(prisma as any, audit, storage);
    const files = new FilesService(prisma as any, new StorageService());
    prisma.$transaction = async (operation: (tx: typeof prisma) => unknown) => operation(prisma);
    const designStories = { syncWithDesignDecision: jest.fn().mockResolvedValue(null) } as any;
    const moderation = new ModerationService(prisma as any, audit, designStories);

    const { accessToken } = await auth.register({
      email: "designer-flow@test.local",
      password: "Password123!",
      displayName: "Designer Flow",
    });
    expect(accessToken).toBeDefined();

    const user = await prisma.user.findUnique({ where: { email: "designer-flow@test.local" } });
    expect(user).toBeTruthy();

    const productType = await prisma.productType.create({
      data: {
        tenantId: null,
        name: "T-shirt",
        slug: "phase1-t-shirt",
        category: "APPAREL",
        productionMethod: "DTF",
        isActive: true,
        availableForDesigners: true,
      },
    });
    const baseProduct = await prisma.baseProduct.create({
      data: {
        tenantId: null,
        productTypeId: productType.id,
        name: "Classic tee",
        skuPrefix: "PHASE1-TEE",
        isActive: true,
      },
    });
    const template = await prisma.mockupTemplate.create({
      data: {
        tenantId: null,
        baseProductId: baseProduct.id,
        name: "Classic tee front",
        baseImageKey: "mockups/phase1-tee-front.png",
        isActive: true,
      },
    });
    await prisma.printArea.create({
      data: {
        mockupTemplateId: template.id,
        name: "Front",
        placement: PlacementKind.FRONT,
        x: 100,
        y: 100,
        width: 800,
        height: 1000,
        safeX: 120,
        safeY: 120,
        safeWidth: 760,
        safeHeight: 960,
        isActive: true,
      },
    });

    const design = await designs.create(user!.id, {
      title: "Bird",
      description: "Blue bird logo",
      requestedBaseProductId: baseProduct.id,
    });
    const upload = await files.createUploadUrl(user!.id, {
      filename: "bird.png",
      mimeType: "image/png",
      sizeBytes: 120000,
      designId: design.id,
    });
    await files.completeUpload(user!.id, {
      fileId: upload.fileId,
      uploadedSizeBytes: 120000,
      uploadedMimeType: "image/png",
    });

    const version = await designs.createVersion(user!.id, design.id, {
      fileId: upload.fileId,
      widthPx: 2000,
      heightPx: 2000,
      dpi: 300,
      placement: PlacementKind.FRONT,
    });
    expect(version.designAssetId).toBe(design.id);

    const submitted = await designs.submit(user!.id, design.id);
    expect(submitted.status).toBe("PENDING_MODERATION");

    const moderator = await prisma.user.create({
      data: {
        email: "mod-flow@test.local",
        passwordHash: "x",
        displayName: "Mod",
        role: "MODERATOR",
      },
    });
    const approved = await moderation.decision(moderator.id, design.id, "APPROVED");
    expect(approved.status).toBe("APPROVED");

    const history = await moderation.history(design.id);
    expect(history.length).toBe(1);
    expect(history[0].decision).toBe("APPROVE");
  });
});

import { JwtService } from "@nestjs/jwt";
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
    const auth = new AuthService(prisma as any, jwt, audit);
    const designs = new DesignsService(prisma as any, audit);
    const files = new FilesService(prisma as any, new StorageService());
    const moderation = new ModerationService(prisma as any, audit);

    const { accessToken } = await auth.register({
      email: "designer-flow@test.local",
      password: "Password123!",
      displayName: "Designer Flow",
    });
    expect(accessToken).toBeDefined();

    const user = await prisma.user.findUnique({ where: { email: "designer-flow@test.local" } });
    expect(user).toBeTruthy();

    const design = await designs.create(user!.id, { title: "Bird", description: "Blue bird logo" });
    const upload = await files.createUploadUrl(user!.id, {
      filename: "bird.png",
      mimeType: "image/png",
      sizeBytes: 120000,
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
    });
    expect(version.designAssetId).toBe(design.id);

    const submitted = await designs.submit(user!.id, design.id);
    expect(submitted.status).toBe("SUBMITTED");

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

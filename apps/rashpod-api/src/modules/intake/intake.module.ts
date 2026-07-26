import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { DesignerInvitationsModule } from "../designer-invitations/designer-invitations.module";
import { AdminIntakeController, PublicIntakeController } from "./intake.controller";
import { IntakeService } from "./intake.service";

@Module({
  imports: [PrismaModule, AuditModule, FilesModule, DesignerInvitationsModule],
  controllers: [PublicIntakeController, AdminIntakeController],
  providers: [IntakeService],
})
export class IntakeModule {}

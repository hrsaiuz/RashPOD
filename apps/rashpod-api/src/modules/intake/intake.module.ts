import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { AdminIntakeController, PublicIntakeController } from "./intake.controller";
import { IntakeService } from "./intake.service";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PublicIntakeController, AdminIntakeController],
  providers: [IntakeService],
})
export class IntakeModule {}

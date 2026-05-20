import { Injectable, NotFoundException } from "@nestjs/common";
import { IntakeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";
import { CreateCustomOrderRequestDto } from "./dto/create-custom-order-request.dto";
import { CreateDesignerApplicationDto } from "./dto/create-designer-application.dto";
import { UpdateIntakeStatusDto } from "./dto/update-intake-status.dto";

type IntakeType = "designer-applications" | "contact-messages" | "custom-order-requests";

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createDesignerApplication(dto: CreateDesignerApplicationDto) {
    return this.prisma.designerApplication.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.toLowerCase().trim(),
        phoneCountryCode: dto.phoneCountryCode,
        phoneNumber: dto.phoneNumber,
        telegramUsername: dto.telegramUsername,
        passwordProvided: dto.passwordProvided ?? false,
        displayName: dto.displayName,
        country: dto.country,
        city: dto.city,
        designCategories: jsonOrNull(dto.designCategories),
        shortBio: dto.shortBio,
        portfolioFiles: jsonOrNull(dto.portfolioFiles),
        identityFiles: jsonOrNull(dto.identityFiles),
        selfieFiles: jsonOrNull(dto.selfieFiles),
        confirmations: jsonOrNull(dto.confirmations),
      },
    });
  }

  async createContactMessage(dto: CreateContactMessageDto) {
    return this.prisma.contactMessage.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName?.trim(),
        email: dto.email.toLowerCase().trim(),
        phoneNumber: dto.phoneNumber,
        subject: dto.subject,
        message: dto.message,
      },
    });
  }

  async createCustomOrderRequest(dto: CreateCustomOrderRequestDto) {
    return this.prisma.customOrderRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        companyEventName: dto.companyEventName,
        email: dto.email.toLowerCase().trim(),
        phoneCountryCode: dto.phoneCountryCode,
        phoneNumber: dto.phoneNumber,
        details: dto.details,
        estimatedBudget: dto.estimatedBudget,
        preferredDelivery: dto.preferredDelivery,
        productNeed: dto.productNeed,
        quantity: dto.quantity,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        hasDesign: dto.hasDesign,
        designTypes: dto.designTypes,
        uploadedFiles: jsonOrNull(dto.uploadedFiles),
      },
    });
  }

  list(type: IntakeType, status?: IntakeStatus) {
    const where = status ? { status } : {};
    if (type === "designer-applications") {
      return this.prisma.designerApplication.findMany({ where, orderBy: { submittedAt: "desc" } });
    }
    if (type === "contact-messages") {
      return this.prisma.contactMessage.findMany({ where, orderBy: { submittedAt: "desc" } });
    }
    return this.prisma.customOrderRequest.findMany({ where, orderBy: { submittedAt: "desc" } });
  }

  async update(type: IntakeType, id: string, dto: UpdateIntakeStatusDto, actorId: string) {
    const data = {
      status: dto.status,
      reviewNotes: dto.reviewNotes,
    };
    let entity: { id: string } | null = null;
    if (type === "designer-applications") {
      entity = await this.prisma.designerApplication.update({ where: { id }, data }).catch(() => null);
    } else if (type === "contact-messages") {
      entity = await this.prisma.contactMessage.update({ where: { id }, data }).catch(() => null);
    } else {
      entity = await this.prisma.customOrderRequest.update({ where: { id }, data }).catch(() => null);
    }
    if (!entity) throw new NotFoundException("Intake record not found");
    await this.audit.log({
      actorId,
      action: `intake.${type}.update`,
      entityType: type,
      entityId: id,
      metadata: { status: dto.status ?? null },
    });
    return entity;
  }
}

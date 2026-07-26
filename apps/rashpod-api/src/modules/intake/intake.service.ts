import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetLifecycleStatus, AssetPurpose, IntakeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CompleteUploadDto } from "../files/dto/complete-upload.dto";
import { CreateUploadUrlDto } from "../files/dto/create-upload-url.dto";
import { FilesService } from "../files/files.service";
import { CreateContactMessageDto } from "./dto/create-contact-message.dto";
import { CreateCustomOrderRequestDto } from "./dto/create-custom-order-request.dto";
import { CreateDesignerApplicationDto } from "./dto/create-designer-application.dto";
import { UpdateIntakeStatusDto } from "./dto/update-intake-status.dto";
import { DesignerInvitationsService } from "../designer-invitations/designer-invitations.service";

type IntakeType = "designer-applications" | "contact-messages" | "custom-order-requests";

function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
    private readonly invitations: DesignerInvitationsService,
  ) {}

  private getIntakeOwnerId() {
    const ownerId = process.env.INTAKE_SYSTEM_OWNER_ID;
    if (!ownerId) {
      throw new ServiceUnavailableException("Intake uploads are not configured");
    }
    return ownerId;
  }

  createPublicUploadUrl(dto: CreateUploadUrlDto) {
    return this.files.createUploadUrl(this.getIntakeOwnerId(), dto);
  }

  completePublicUpload(dto: CompleteUploadDto) {
    return this.files.completeUpload(this.getIntakeOwnerId(), dto);
  }

  async createDesignerApplication(dto: CreateDesignerApplicationDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.designerApplication.findFirst({
      where: { email, status: { in: [IntakeStatus.NEW, IntakeStatus.IN_REVIEW, IntakeStatus.CONTACTED, IntakeStatus.APPROVED] } },
      select: { id: true },
    });
    if (existing) throw new ConflictException("An active designer application already exists for this email");
    const requiredConfirmations = ["ownWork", "noProhibitedContent", "noApprovalGuarantee", "terms"];
    if (!requiredConfirmations.every((key) => dto.confirmations?.[key] === true)) {
      throw new BadRequestException("All designer agreements must be accepted");
    }
    await this.validateDesignerEvidence(dto.portfolioFiles, AssetPurpose.DESIGNER_PORTFOLIO, "portfolio");
    await this.validateDesignerEvidence(dto.identityFiles, AssetPurpose.DESIGNER_IDENTITY, "identity document");
    await this.validateDesignerEvidence(dto.selfieFiles, AssetPurpose.DESIGNER_SELFIE, "selfie");
    const application = await this.prisma.designerApplication.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
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
    return { id: application.id, status: application.status, submittedAt: application.submittedAt };
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
      const current = await this.prisma.designerApplication.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("designer-applications record not found");
      if (dto.status === IntakeStatus.REJECTED && !dto.reviewNotes?.trim()) {
        throw new BadRequestException("A rejection reason is required");
      }
      let invitationId = current.invitationId;
      if (dto.status === IntakeStatus.APPROVED && !invitationId) {
        const invitation = await this.invitations.create(
          { sub: actorId, email: "", role: "ADMIN", tenantId: current.tenantId ?? undefined },
          {
            email: current.email,
            displayName: current.displayName || `${current.firstName} ${current.lastName}`.trim(),
            locale: "uz",
            personalMessage: "Your RashPOD designer application was approved. Accept this invitation to activate your account.",
          },
        );
        invitationId = invitation.id;
      }
      if (dto.status === IntakeStatus.REJECTED && current.status !== IntakeStatus.REJECTED) {
        await this.invitations.notifyApplicationRejected({
          email: current.email,
          displayName: current.displayName || `${current.firstName} ${current.lastName}`.trim(),
          reason: dto.reviewNotes,
        });
      }
      entity = await this.prisma.designerApplication.update({
        where: { id },
        data: {
          ...data,
          invitationId,
          ...(dto.status === IntakeStatus.APPROVED || dto.status === IntakeStatus.REJECTED
            ? { reviewedById: actorId, reviewedAt: new Date() }
            : {}),
        },
      });
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

  getDesignerEvidenceUrl(fileId: string) {
    return this.files.getInternalReviewUrl(fileId, [
      AssetPurpose.DESIGNER_PORTFOLIO,
      AssetPurpose.DESIGNER_IDENTITY,
      AssetPurpose.DESIGNER_SELFIE,
    ]);
  }

  private async validateDesignerEvidence(
    value: unknown[] | undefined,
    purpose: AssetPurpose,
    label: string,
  ) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException(`At least one ${label} file is required`);
    }
    const fileIds = value
      .map((entry) => (entry && typeof entry === "object" && "fileId" in entry ? String((entry as { fileId: unknown }).fileId) : ""))
      .filter(Boolean);
    if (fileIds.length !== value.length) throw new BadRequestException(`Invalid ${label} file reference`);
    const files = await this.prisma.fileAsset.findMany({
      where: {
        id: { in: fileIds },
        ownerId: this.getIntakeOwnerId(),
        purpose,
        status: AssetLifecycleStatus.READY,
      },
      select: { id: true },
    });
    if (files.length !== fileIds.length) throw new BadRequestException(`One or more ${label} files are invalid`);
  }
}

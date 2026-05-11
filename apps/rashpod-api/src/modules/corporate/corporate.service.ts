import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CommercialOfferStatus, CorporateRequestStatus, DesignerBidStatus, Prisma, ProductionJobStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { RequestUser } from "../../common/auth/current-user.decorator";
import { CreateCorporateRequestDto } from "./dto/create-corporate-request.dto";
import { CreateDesignerBidDto } from "./dto/create-designer-bid.dto";
import { CreateCommercialOfferDto } from "./dto/create-commercial-offer.dto";
import { UpdateCorporateRequestDto } from "./dto/update-corporate-request.dto";
import { UpdateCommercialOfferDto } from "./dto/update-commercial-offer.dto";

@Injectable()
export class CorporateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createRequest(user: RequestUser, dto: CreateCorporateRequestDto) {
    const request = await this.prisma.corporateRequest.create({
      data: {
        corporateUserId: user.sub,
        title: dto.title,
        details: dto.details,
        quantity: dto.quantity,
        budget: dto.budget == null ? null : new Prisma.Decimal(dto.budget),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        status: CorporateRequestStatus.OPEN,
      },
    });
    await this.audit.log({ actorId: user.sub, action: "corporate-request.create", entityType: "CorporateRequest", entityId: request.id });
    return request;
  }

  listRequests(user: RequestUser) {
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.OPERATIONS_MANAGER;
    return this.prisma.corporateRequest.findMany({
      where: isAdmin ? {} : { corporateUserId: user.sub },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRequest(user: RequestUser, requestId: string) {
    const request = await this.prisma.corporateRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Corporate request not found");
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.OPERATIONS_MANAGER;
    if (!isAdmin && request.corporateUserId !== user.sub) throw new ForbiddenException("Not your request");
    return request;
  }

  async updateRequest(user: RequestUser, requestId: string, dto: UpdateCorporateRequestDto) {
    const current = await this.getRequest(user, requestId);
    if (
      current.status === CorporateRequestStatus.ACCEPTED ||
      current.status === CorporateRequestStatus.REJECTED
    ) {
      throw new ForbiddenException("Finalized corporate request cannot be updated");
    }
    const updated = await this.prisma.corporateRequest.update({
      where: { id: requestId },
      data: {
        title: dto.title,
        details: dto.details,
        quantity: dto.quantity,
        budget: dto.budget == null ? undefined : new Prisma.Decimal(dto.budget),
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });
    await this.audit.log({ actorId: user.sub, action: "corporate-request.update", entityType: "CorporateRequest", entityId: requestId });
    return updated;
  }

  async createBid(user: RequestUser, requestId: string, dto: CreateDesignerBidDto) {
    const req = await this.prisma.corporateRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException("Corporate request not found");
    const bid = await this.prisma.designerBid.create({
      data: {
        corporateRequestId: requestId,
        designerId: user.sub,
        proposal: dto.proposal,
        designFee: new Prisma.Decimal(dto.designFee),
        timelineDays: dto.timelineDays,
        status: DesignerBidStatus.SUBMITTED,
      },
    });
    await this.prisma.corporateRequest.update({
      where: { id: requestId },
      data: { status: CorporateRequestStatus.BIDDING },
    });
    await this.audit.log({ actorId: user.sub, action: "designer-bid.create", entityType: "DesignerBid", entityId: bid.id });
    return bid;
  }

  listBids(user: RequestUser, requestId: string) {
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.OPERATIONS_MANAGER;
    return this.prisma.designerBid.findMany({
      where: { corporateRequestId: requestId, ...(isAdmin ? {} : { designerId: user.sub }) },
      orderBy: { createdAt: "desc" },
    });
  }

  listMyBids(user: RequestUser) {
    return this.prisma.designerBid.findMany({
      where: { designerId: user.sub },
      orderBy: { createdAt: "desc" },
      include: { corporateRequest: true },
    });
  }

  async selectBid(actorId: string, bidId: string) {
    const bid = await this.prisma.designerBid.findUnique({ where: { id: bidId } });
    if (!bid) throw new NotFoundException("Bid not found");
    await this.prisma.designerBid.updateMany({
      where: { corporateRequestId: bid.corporateRequestId },
      data: { status: DesignerBidStatus.REJECTED },
    });
    const updated = await this.prisma.designerBid.update({
      where: { id: bidId },
      data: { status: DesignerBidStatus.SELECTED },
    });
    await this.prisma.corporateRequest.update({
      where: { id: bid.corporateRequestId },
      data: { status: CorporateRequestStatus.IN_REVIEW },
    });
    await this.audit.log({ actorId, action: "designer-bid.select", entityType: "DesignerBid", entityId: bidId });
    return updated;
  }

  async createOffer(actorId: string, requestId: string, dto: CreateCommercialOfferDto) {
    const req = await this.prisma.corporateRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException("Corporate request not found");
    const bid = await this.prisma.designerBid.findUnique({ where: { id: dto.selectedBidId } });
    if (!bid || bid.corporateRequestId !== requestId) throw new NotFoundException("Selected bid not found for request");
    const discount = dto.discount || 0;
    const total = dto.subtotal - discount;
    const offer = await this.prisma.commercialOffer.create({
      data: {
        corporateRequestId: requestId,
        selectedBidId: dto.selectedBidId,
        offerNumber: `OFF-${Date.now()}`,
        status: CommercialOfferStatus.DRAFT,
        subtotal: new Prisma.Decimal(dto.subtotal),
        discount: new Prisma.Decimal(discount),
        total: new Prisma.Decimal(total),
        terms: dto.terms,
      },
    });
    await this.prisma.corporateRequest.update({
      where: { id: requestId },
      data: { status: CorporateRequestStatus.OFFER_PENDING },
    });
    await this.audit.log({ actorId, action: "commercial-offer.create", entityType: "CommercialOffer", entityId: offer.id });
    return offer;
  }

  async sendOffer(actorId: string, offerId: string) {
    const offer = await this.prisma.commercialOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException("Offer not found");
    const updated = await this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: { status: CommercialOfferStatus.SENT, sentAt: new Date() },
    });
    await this.audit.log({ actorId, action: "commercial-offer.send", entityType: "CommercialOffer", entityId: offerId });
    return updated;
  }

  async getOffer(actorId: string, offerId: string) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { corporateRequest: true, selectedBid: true },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    await this.audit.log({ actorId, action: "commercial-offer.read", entityType: "CommercialOffer", entityId: offerId });
    return offer;
  }

  async updateOffer(actorId: string, offerId: string, dto: UpdateCommercialOfferDto) {
    const existing = await this.prisma.commercialOffer.findUnique({ where: { id: offerId } });
    if (!existing) throw new NotFoundException("Offer not found");
    if (
      existing.status === CommercialOfferStatus.ACCEPTED ||
      existing.status === CommercialOfferStatus.REJECTED
    ) {
      throw new ForbiddenException("Finalized offer cannot be updated");
    }
    const subtotal = dto.subtotal ?? Number(existing.subtotal);
    const discount = dto.discount ?? Number(existing.discount);
    const total = subtotal - discount;
    const updated = await this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        total: new Prisma.Decimal(total),
        terms: dto.terms ?? undefined,
      },
    });
    await this.audit.log({ actorId, action: "commercial-offer.update", entityType: "CommercialOffer", entityId: offerId });
    return updated;
  }

  async generateOfferPdf(actorId: string, offerId: string) {
    const offer = await this.prisma.commercialOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException("Offer not found");
    const job = await this.prisma.workerJob.create({
      data: {
        type: "GENERATE_COMMERCIAL_OFFER_PDF",
        payloadJson: { offerId },
      },
    });
    await this.audit.log({ actorId, action: "commercial-offer.generate-pdf", entityType: "CommercialOffer", entityId: offerId });
    return { offerId, jobId: job.id, status: "queued" as const };
  }

  async acceptOffer(user: RequestUser, offerId: string) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { corporateRequest: true },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.corporateRequest.corporateUserId !== user.sub) {
      const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
      if (!isAdmin) throw new ForbiddenException("Not your offer");
    }
    const updated = await this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: { status: CommercialOfferStatus.ACCEPTED, acceptedAt: new Date() },
    });
    await this.prisma.corporateRequest.update({
      where: { id: offer.corporateRequestId },
      data: { status: CorporateRequestStatus.ACCEPTED },
    });
    const order = await this.prisma.order.create({
      data: {
        customerId: offer.corporateRequest.corporateUserId,
        status: "PAID",
        subtotal: offer.subtotal,
        deliveryFee: 0,
        total: offer.total,
        notes: `Corporate offer ${offer.offerNumber}`,
      },
    });
    await this.prisma.productionJob.create({
      data: {
        orderId: order.id,
        queueType: "CORPORATE",
        status: ProductionJobStatus.ORDERED,
        notes: `From corporate offer ${offer.offerNumber}`,
      },
    });
    await this.audit.log({ actorId: user.sub, action: "commercial-offer.accept", entityType: "CommercialOffer", entityId: offerId });
    return updated;
  }

  async rejectOffer(user: RequestUser, offerId: string) {
    const offer = await this.prisma.commercialOffer.findUnique({
      where: { id: offerId },
      include: { corporateRequest: true },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.corporateRequest.corporateUserId !== user.sub) {
      const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
      if (!isAdmin) throw new ForbiddenException("Not your offer");
    }
    const updated = await this.prisma.commercialOffer.update({
      where: { id: offerId },
      data: { status: CommercialOfferStatus.REJECTED, rejectedAt: new Date() },
    });
    await this.prisma.corporateRequest.update({
      where: { id: offer.corporateRequestId },
      data: { status: CorporateRequestStatus.REJECTED },
    });
    await this.audit.log({ actorId: user.sub, action: "commercial-offer.reject", entityType: "CommercialOffer", entityId: offerId });
    return updated;
  }
}

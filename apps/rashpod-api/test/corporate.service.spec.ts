import { ForbiddenException } from "@nestjs/common";
import { CommercialOfferStatus, CorporateRequestStatus, UserRole } from "@prisma/client";
import { CorporateService } from "../src/modules/corporate/corporate.service";

describe("CorporateService completeness", () => {
  const corporateUser = { sub: "corp_1", email: "corp@rashpod.uz", role: UserRole.CORPORATE_CLIENT };

  it("updates own corporate request", async () => {
    const prisma: any = {
      corporateRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: "req_1",
          corporateUserId: "corp_1",
          status: CorporateRequestStatus.OPEN,
        }),
        update: jest.fn().mockResolvedValue({ id: "req_1", title: "Updated" }),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new CorporateService(prisma, audit);

    await service.updateRequest(corporateUser as any, "req_1", { title: "Updated" });

    expect(prisma.corporateRequest.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "corporate-request.update", entityId: "req_1" }),
    );
  });

  it("queues pdf generation job for existing offer", async () => {
    const prisma: any = {
      commercialOffer: { findUnique: jest.fn().mockResolvedValue({ id: "off_1" }) },
      workerJob: { create: jest.fn().mockResolvedValue({ id: "job_1" }) },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new CorporateService(prisma, audit);

    const result = await service.generateOfferPdf("admin_1", "off_1");

    expect(result).toEqual({ offerId: "off_1", jobId: "job_1", status: "queued" });
    expect(prisma.workerJob.create).toHaveBeenCalledWith({
      data: { type: "GENERATE_COMMERCIAL_OFFER_PDF", payloadJson: { offerId: "off_1" } },
    });
  });

  it("rejects offer for owner and marks request rejected", async () => {
    const prisma: any = {
      commercialOffer: {
        findUnique: jest.fn().mockResolvedValue({
          id: "off_2",
          corporateRequestId: "req_2",
          corporateRequest: { corporateUserId: "corp_1" },
        }),
        update: jest.fn().mockResolvedValue({ id: "off_2", status: CommercialOfferStatus.REJECTED }),
      },
      corporateRequest: { update: jest.fn().mockResolvedValue({ id: "req_2", status: CorporateRequestStatus.REJECTED }) },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new CorporateService(prisma, audit);

    await service.rejectOffer(corporateUser as any, "off_2");

    expect(prisma.commercialOffer.update).toHaveBeenCalled();
    expect(prisma.corporateRequest.update).toHaveBeenCalledWith({
      where: { id: "req_2" },
      data: { status: CorporateRequestStatus.REJECTED },
    });
  });

  it("blocks reject for unrelated non-admin user", async () => {
    const prisma: any = {
      commercialOffer: {
        findUnique: jest.fn().mockResolvedValue({
          id: "off_3",
          corporateRequestId: "req_3",
          corporateRequest: { corporateUserId: "corp_owner" },
        }),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new CorporateService(prisma, audit);

    await expect(service.rejectOffer(corporateUser as any, "off_3")).rejects.toBeInstanceOf(ForbiddenException);
  });
});

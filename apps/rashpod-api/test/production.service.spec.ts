import { ProductionJobStatus } from "@prisma/client";
import { ProductionService } from "../src/modules/production/production.service";
import { AuditService } from "../src/modules/audit/audit.service";

describe("ProductionService", () => {
  it("assigns production job and appends assignment note", async () => {
    const prisma: any = {
      productionJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pj1",
          status: ProductionJobStatus.ORDERED,
          notes: null,
        }),
        update: jest.fn().mockResolvedValue({
          id: "pj1",
          status: ProductionJobStatus.ORDERED,
          notes: "[ASSIGN] assignee=staff-1 note=Urgent job",
        }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new ProductionService(prisma, audit);

    const result = await service.assign("admin-1", "pj1", "staff-1", "Urgent job");
    expect(result.notes).toContain("[ASSIGN]");
    expect(prisma.productionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pj1" },
        data: expect.objectContaining({ notes: expect.stringContaining("assignee=staff-1") }),
      }),
    );
    expect((audit.log as any)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "production.assign", entityId: "pj1" }),
    );
  });

  it("submits passing QC and advances to PACKING", async () => {
    const prisma: any = {
      productionJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pj2",
          status: ProductionJobStatus.QC,
          notes: "existing",
        }),
        update: jest.fn().mockResolvedValue({
          id: "pj2",
          status: ProductionJobStatus.PACKING,
          notes:
            'existing\n[QC] result=PASS note=Looks good checklist={"printQuality":true,"sizeAccuracy":true,"placementAccuracy":true,"packagingReady":true}',
        }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new ProductionService(prisma, audit);

    const result = await service.submitQc("staff-2", "pj2", true, "Looks good", {
      printQuality: true,
      sizeAccuracy: true,
      placementAccuracy: true,
      packagingReady: true,
    });
    expect(result.status).toBe(ProductionJobStatus.PACKING);
    expect(result.notes).toContain("[QC] result=PASS");
    expect(result.notes).toContain("checklist=");
  });

  it("submits failing QC and moves back to FILE_CHECK", async () => {
    const prisma: any = {
      productionJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pj3",
          status: ProductionJobStatus.QC,
          notes: null,
        }),
        update: jest.fn().mockResolvedValue({
          id: "pj3",
          status: ProductionJobStatus.FILE_CHECK,
          notes: "[QC] result=FAIL note=Color mismatch",
        }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new ProductionService(prisma, audit);

    const result = await service.submitQc("staff-2", "pj3", false, "Color mismatch");
    expect(result.status).toBe(ProductionJobStatus.FILE_CHECK);
    expect(result.notes).toContain("[QC] result=FAIL");
  });
});

import { JobDispatcherService } from "../src/modules/worker-jobs/job-dispatcher.service";
import { AuditService } from "../src/modules/audit/audit.service";
import { createFakePrisma } from "./helpers/fake-prisma";

describe("Worker jobs admin ops", () => {
  it("retries a failed job and resets status/attempts", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const created = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", {
      placementId: "p1",
      generatedAssetId: "g1",
    });
    const jobId = created.jobId;

    await prisma.workerJob.update({
      where: { id: jobId },
      data: { status: "FAILED", attempts: 3, errorMessage: "render fail" },
    });

    const retried = await service.retry("admin-1", jobId);
    expect(retried?.status).toBe("PENDING");
    expect(retried?.attempts).toBe(0);
    expect(retried?.errorMessage).toBeNull();
  });

  it("does not retry non-failed jobs", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const created = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", {
      placementId: "p1",
      generatedAssetId: "g1",
    });
    const original = await prisma.workerJob.findUnique({ where: { id: created.jobId } });
    expect(original).toBeTruthy();

    const retried = await service.retry("admin-1", created.jobId);
    expect(retried?.status).toBe(original?.status);
    expect(retried?.attempts).toBe(original?.attempts);
  });

  it("cancels a job and marks it failed terminally", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const created = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", {
      placementId: "p1",
      generatedAssetId: "g1",
    });

    const cancelled = await service.cancel("admin-1", created.jobId);
    expect(cancelled?.status).toBe("FAILED");
    expect(cancelled?.errorMessage).toBe("Cancelled by admin");
  });

  it("lists dead-letter jobs via filter", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const one = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p1", generatedAssetId: "g1" });
    const two = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p2", generatedAssetId: "g2" });
    await prisma.workerJob.update({ where: { id: one.jobId }, data: { status: "FAILED", attempts: 3, maxAttempts: 3 } });
    await prisma.workerJob.update({ where: { id: two.jobId }, data: { status: "COMPLETED" } });

    const three = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p3", generatedAssetId: "g3" });
    await prisma.workerJob.update({ where: { id: three.jobId }, data: { status: "FAILED", attempts: 1, maxAttempts: 3 } });

    const dead = await service.list({ deadLetter: "true" });
    expect(dead).toHaveLength(1);
    expect(dead[0]?.id).toBe(one.jobId);
  });

  it("retries only retry-saturated dead-letter jobs in batch", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const saturated = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p1", generatedAssetId: "g1" });
    const unsaturated = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p2", generatedAssetId: "g2" });
    const completed = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p3", generatedAssetId: "g3" });

    await prisma.workerJob.update({
      where: { id: saturated.jobId },
      data: { status: "FAILED", attempts: 3, maxAttempts: 3, errorMessage: "hard fail" },
    });
    await prisma.workerJob.update({
      where: { id: unsaturated.jobId },
      data: { status: "FAILED", attempts: 1, maxAttempts: 3, errorMessage: "temp fail" },
    });
    await prisma.workerJob.update({ where: { id: completed.jobId }, data: { status: "COMPLETED" } });

    const result = await service.retryDeadLetter("admin-1", [saturated.jobId, unsaturated.jobId, completed.jobId]);
    expect(result.requested).toBe(3);
    expect(result.retriedCount).toBe(1);
    expect(result.retriedIds).toEqual([saturated.jobId]);

    const sat = await prisma.workerJob.findUnique({ where: { id: saturated.jobId } });
    expect(sat?.status).toBe("PENDING");
    expect(sat?.attempts).toBe(0);
    expect(sat?.errorMessage).toBeNull();

    const unsat = await prisma.workerJob.findUnique({ where: { id: unsaturated.jobId } });
    expect(unsat?.status).toBe("FAILED");
    expect(unsat?.attempts).toBe(1);

    const auditLog = prisma.__state.audits.find((a: any) => a.action === "worker-job.dead-letter.retry");
    expect(auditLog).toBeTruthy();
  });

  it("returns queue metrics with retry saturation and lag", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const p = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p", generatedAssetId: "g" });
    const pr = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p2", generatedAssetId: "g2" });
    const f = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p3", generatedAssetId: "g3" });

    await prisma.workerJob.update({ where: { id: pr.jobId }, data: { status: "PROCESSING", attempts: 1 } });
    await prisma.workerJob.update({ where: { id: f.jobId }, data: { status: "FAILED", attempts: 3, maxAttempts: 3 } });

    const metrics = await service.metrics();
    expect(metrics.totals.pending).toBe(1);
    expect(metrics.totals.processing).toBe(1);
    expect(metrics.totals.failed).toBe(1);
    expect(metrics.retry.saturatedFailed).toBe(1);
    expect(metrics.lag.oldestPendingAgeSeconds).toBeGreaterThanOrEqual(0);
    expect(p.jobId).toBeTruthy();
  });

  it("evaluates health against thresholds", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const a = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p1", generatedAssetId: "g1" });
    const b = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p2", generatedAssetId: "g2" });
    const c = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p3", generatedAssetId: "g3" });
    await prisma.workerJob.update({ where: { id: b.jobId }, data: { status: "FAILED", attempts: 3, maxAttempts: 3 } });
    await prisma.workerJob.update({ where: { id: c.jobId }, data: { status: "FAILED", attempts: 3, maxAttempts: 3 } });
    await prisma.workerJob.update({
      where: { id: a.jobId },
      data: { createdAt: new Date(Date.now() - 2000) },
    });

    const health = await service.health({ oldestPendingAgeSeconds: 1, failedRatePercent: 40 });
    expect(health.ok).toBe(false);
    expect(health.breaches.lagBreached).toBe(true);
    expect(health.breaches.failedRateBreached).toBe(true);
    expect(health.metrics.rates.failedRatePercent).toBeGreaterThan(40);
  });

  it("emits breach audit and alert job on health check", async () => {
    const prisma = createFakePrisma();
    const audit = new AuditService(prisma as any);
    const service = new JobDispatcherService(prisma as any, audit);

    const a = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p1", generatedAssetId: "g1" });
    const b = await service.enqueue("GENERATE_PRODUCT_MOCKUPS", { placementId: "p2", generatedAssetId: "g2" });
    await prisma.workerJob.update({ where: { id: b.jobId }, data: { status: "FAILED", attempts: 3, maxAttempts: 3 } });
    await prisma.workerJob.update({
      where: { id: a.jobId },
      data: { createdAt: new Date(Date.now() - 3000) },
    });

    const checked = await service.checkHealthAndAlert("admin_1", {
      oldestPendingAgeSeconds: 1,
      failedRatePercent: 10,
      alertCooldownSeconds: 0,
      alertRecipients: ["ops1@test.local", "ops2@test.local"],
    });

    expect(checked.ok).toBe(false);
    expect(checked.alert.emitted).toBe(true);
    const alertJobs = prisma.__state.workerJobs.filter((j: any) => j.type === "SEND_EMAIL");
    expect(alertJobs).toHaveLength(2);
    expect(alertJobs[0]?.payloadJson).toEqual(
      expect.objectContaining({
        to: expect.any(String),
        templateKey: "worker_queue_alert",
        subject: "RashPOD Queue Alert",
        variables: expect.any(Object),
        idempotencyKey: expect.stringContaining("worker-queue-alert:"),
      }),
    );
    const breachAudit = prisma.__state.audits.find((a: any) => a.action === "worker-job.health.breach");
    expect(breachAudit).toBeTruthy();
  });
});

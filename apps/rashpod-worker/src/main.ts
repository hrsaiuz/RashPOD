import { createServer } from "node:http";
import { closePrismaClient, getPrismaClient } from "./db";
import { WorkerDispatcher } from "./dispatcher";
import { InMemoryWorkerRepository } from "./mock-repository";
import { PrismaAssetRepository } from "./prisma-asset-repository";
import { QueueRepository } from "./queue-repository";
import { WorkerProcessor } from "./processor";
import { WorkerJob } from "./types";
import { workerLogger } from "./logger";
import { assertWorkerEnvironment, validateWorkerEnvironment } from "./runtime-config";

const jobs = [
  "GENERATE_PRODUCT_MOCKUPS",
  "GENERATE_LISTING_IMAGE_PACK",
  "GENERATE_FILM_PREVIEW",
  "GENERATE_PRODUCTION_FILE",
  "SEND_EMAIL",
  "TELEGRAM_SEND",
] as const;

function bootstrap() {
  assertWorkerEnvironment();
  // Worker skeleton with queue-dispatch wiring.
  workerLogger.info(`[rashpod-worker] ready. registered jobs: ${jobs.join(", ")}`);
  const port = Number(process.env.PORT || 8080);
  let stopping = false;
  const server = createServer(async (req, res) => {
    if (req.url?.startsWith("/health/ready")) {
      const env = validateWorkerEnvironment();
      let dbReady = true;
      try {
        await getPrismaClient().$queryRaw`SELECT 1`;
      } catch {
        dbReady = false;
      }
      const checks = [...env.checks, { key: "DB_CONNECTIVITY", label: "Database connectivity", status: dbReady ? "PASS" : "FAIL", explanation: dbReady ? "Database connection succeeded." : "Database connection failed." }];
      const ok = !stopping && checks.every((check) => check.status !== "FAIL");
      res.writeHead(ok ? 200 : 503, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok, status: ok ? "ready" : "not_ready", service: "rashpod-worker", checks }));
      return;
    }
    res.writeHead(stopping ? 503 : 200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: !stopping, status: stopping ? "stopping" : "live", service: "rashpod-worker" }));
  }).listen(port, () => {
    workerLogger.info(`[rashpod-worker] health server listening on ${port}`);
  });

  const useInMemoryDemo = (process.env.WORKER_IN_MEMORY_DEMO || "false") === "true";
  const repo = useInMemoryDemo ? new InMemoryWorkerRepository() : new PrismaAssetRepository();
  const dispatcher = new WorkerDispatcher(repo);

  if (useInMemoryDemo) {
    const sample: WorkerJob = {
      id: "sample-preview-job",
      type: "GENERATE_PRODUCT_MOCKUPS",
      payload: { placementId: "placement-sample", generatedAssetId: "asset-sample" },
      createdAt: new Date().toISOString(),
    };
    void dispatcher.dispatch(sample);
    return;
  }

  const queue = new QueueRepository();
  const processor = new WorkerProcessor(queue, dispatcher);
  const tick = async () => void processor.processOnce();
  const timer = setInterval(() => void tick(), Number(process.env.WORKER_POLL_MS || 1500));
  timer.unref();

  const shutdown = async (signal: string) => {
    stopping = true;
    workerLogger.info(JSON.stringify({ level: "info", event: "worker.shutdown.start", signal }));
    clearInterval(timer);
    server.close(async () => {
      await closePrismaClient();
      workerLogger.info(JSON.stringify({ level: "info", event: "worker.shutdown.complete", signal }));
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}

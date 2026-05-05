import { createServer } from "node:http";
import { WorkerDispatcher } from "./dispatcher";
import { InMemoryWorkerRepository } from "./mock-repository";
import { PrismaAssetRepository } from "./prisma-asset-repository";
import { QueueRepository } from "./queue-repository";
import { WorkerProcessor } from "./processor";
import { WorkerJob } from "./types";
import { workerLogger } from "./logger";

const jobs = [
  "GENERATE_PRODUCT_MOCKUPS",
  "GENERATE_LISTING_IMAGE_PACK",
  "GENERATE_FILM_PREVIEW",
  "GENERATE_PRODUCTION_FILE",
  "SEND_EMAIL",
] as const;

function bootstrap() {
  // Worker skeleton with queue-dispatch wiring.
  workerLogger.info(`[rashpod-worker] ready. registered jobs: ${jobs.join(", ")}`);
  const port = Number(process.env.PORT || 8080);
  createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok");
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
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}

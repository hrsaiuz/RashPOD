import { WorkerLogger } from "./logger";
import { WorkerPoller } from "./poller";

describe("WorkerPoller", () => {
  const logger: WorkerLogger = { info: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("waits for the active poll before scheduling another one", async () => {
    let finishFirstPoll: (() => void) | undefined;
    const firstPoll = new Promise<void>((resolve) => {
      finishFirstPoll = resolve;
    });
    const processor = {
      processOnce: jest.fn()
        .mockImplementationOnce(() => firstPoll)
        .mockResolvedValue({ processed: false }),
    };
    const poller = new WorkerPoller(processor, 1000, logger);

    poller.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(processor.processOnce).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(10_000);
    expect(processor.processOnce).toHaveBeenCalledTimes(1);

    finishFirstPoll?.();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(999);
    expect(processor.processOnce).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(processor.processOnce).toHaveBeenCalledTimes(2);
    await poller.stop();
  });

  it("logs a polling error and continues on the next interval", async () => {
    const processor = {
      processOnce: jest.fn()
        .mockRejectedValueOnce(new Error("database temporarily unavailable"))
        .mockResolvedValue({ processed: false }),
    };
    const poller = new WorkerPoller(processor, 500, logger);

    poller.start();
    await jest.advanceTimersByTimeAsync(0);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('"event":"worker.poll.failed"'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("database temporarily unavailable"));

    await jest.advanceTimersByTimeAsync(500);
    expect(processor.processOnce).toHaveBeenCalledTimes(2);
    await poller.stop();
  });

  it("does not schedule more work after stop", async () => {
    const processor = { processOnce: jest.fn().mockResolvedValue({ processed: false }) };
    const poller = new WorkerPoller(processor, 500, logger);

    poller.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(processor.processOnce).toHaveBeenCalledTimes(1);

    await poller.stop();
    await jest.advanceTimersByTimeAsync(5000);
    expect(processor.processOnce).toHaveBeenCalledTimes(1);
  });
});

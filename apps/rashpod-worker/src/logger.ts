export interface WorkerLogger {
  info(message: string): void;
  error(message: string): void;
}

export const workerLogger: WorkerLogger = {
  info(message: string) {
    console.info(message);
  },
  error(message: string) {
    console.error(message);
  },
};

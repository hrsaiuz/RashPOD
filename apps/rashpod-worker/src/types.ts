export type JobType =
  | "GENERATE_PRODUCT_MOCKUPS"
  | "GENERATE_LISTING_IMAGE_PACK"
  | "GENERATE_FILM_PREVIEW"
  | "GENERATE_PRODUCTION_FILE"
  | "SEND_EMAIL";

export interface WorkerJob<T = Record<string, unknown>> {
  id: string;
  type: JobType;
  payload: T;
  createdAt: string;
}

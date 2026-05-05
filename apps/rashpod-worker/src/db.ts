import { PrismaClient } from "@prisma/client";

let prismaSingleton: PrismaClient | null = null;

export function getPrismaClient() {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }
  return prismaSingleton;
}

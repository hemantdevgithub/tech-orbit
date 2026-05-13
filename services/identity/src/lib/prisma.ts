import { PrismaClient } from "../generated/client/index.js";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances in development (hot reload)
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client;
}

const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export { prisma };
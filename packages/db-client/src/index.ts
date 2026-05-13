import { z } from "zod";

export const DbClientConfigSchema = z.object({
  url: z.string().url(),
  schema: z.string().optional(),
});

export type DbClientConfig = z.infer<typeof DbClientConfigSchema>;

export interface DbClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $query<T>(query: string, params?: unknown[]): Promise<T>;
}

const cachedClients = new Map<string, unknown>();

export function createPrismaClient<T extends { $connect: () => Promise<void>; $disconnect: () => Promise<void> }>(
  schemaName: string,
  config: DbClientConfig
): T {
  const cacheKey = `${schemaName}:${config.url}`;

  if (cachedClients.has(cacheKey)) {
    return cachedClients.get(cacheKey) as T;
  }

  // Dynamic import to support different schemas
  const client = new Proxy({} as T, {
    get(_target, prop) {
      return async (...args: unknown[]) => {
        // @prisma/client ships CJS; dynamic-import wrapping makes its type
        // surface unstable across bundler/node resolution. This function is
        // a generic proxy that doesn't need Prisma's actual types.
        const prismaModule = (await import("@prisma/client")) as unknown as {
          PrismaClient: new (opts: unknown) => {
            $connect: () => Promise<void>;
            $disconnect: () => Promise<void>;
          } & Record<string, (...args: unknown[]) => unknown>;
        };
        const PrismaClient = prismaModule.PrismaClient;

        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: config.url,
            },
          },
        });

        try {
          const result = await (prisma as unknown as Record<string, (...args: unknown[]) => unknown>)[prop as string]?.(...args);
          return result;
        } finally {
          await prisma.$disconnect();
        }
      };
    },
  });

  cachedClients.set(cacheKey, client);
  return client;
}

export async function disconnectAll(): Promise<void> {
  for (const client of cachedClients.values()) {
    const disconnectFn = (client as { $disconnect?: () => Promise<void> }).$disconnect;
    if (disconnectFn) {
      await disconnectFn();
    }
  }
  cachedClients.clear();
}

// ─── Field-level encryption ──────────────────────────────────────────────────
export { createEncryptionService } from "./field-encryption.js";
export type { EncryptedField, EncryptionContext, EncryptionService } from "./field-encryption.js";
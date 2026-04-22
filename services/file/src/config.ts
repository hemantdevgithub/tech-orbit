import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3003),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  SERVICE_NAME: z.string().default("file-svc"),
  DATABASE_URL: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  // Storage mode
  FILE_STORAGE_MODE: z.enum(["local", "s3"]).default("local"),
  FILE_STORAGE_LOCAL_DIR: z.string().default(path.resolve(__dirname, "../../uploads")),
  FILE_BASE_URL: z.string().default("http://localhost:3003"),
  // S3 (only required when FILE_STORAGE_MODE=s3)
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function getConfig(): Config {
  return ConfigSchema.parse(process.env);
}

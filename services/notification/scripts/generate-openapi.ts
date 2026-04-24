import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";

import {
  ErrorResponse,
  NotificationFilterSchema,
  NotificationListResponseSchema,
  NotificationPreferenceResponseSchema,
  NotificationResponseSchema,
  UpdateNotificationPreferenceSchema,
} from "@techorbit/types";

extendZodWithOpenApi(z);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../openapi.yaml");

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const security = [{ bearerAuth: [] }];

const ErrorRef = registry.register("ErrorResponse", ErrorResponse);
const NotificationResponseRef = registry.register("NotificationResponse", NotificationResponseSchema);
const NotificationListResponseRef = registry.register("NotificationListResponse", NotificationListResponseSchema);
const NotificationPreferenceResponseRef = registry.register(
  "NotificationPreferenceResponse",
  NotificationPreferenceResponseSchema,
);
const UpdateNotificationPreferenceRef = registry.register(
  "UpdateNotificationPreference",
  UpdateNotificationPreferenceSchema,
);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

registry.registerPath({
  method: "get", path: "/api/v1/notifications", tags: ["Notifications"],
  summary: "List notifications for the current user", security,
  request: { query: NotificationFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(NotificationListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/notifications/{id}/mark-read", tags: ["Notifications"],
  summary: "Mark a notification as read", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Read", ...json(NotificationResponseRef) },
    401: err("Unauthorized"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/notifications/mark-all-read", tags: ["Notifications"],
  summary: "Mark all unread notifications as read for current user", security,
  responses: {
    200: {
      description: "Updated count",
      content: { "application/json": { schema: z.object({ updatedCount: z.number().int() }) } },
    },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/notification-preferences", tags: ["Preferences"],
  summary: "Get current user's notification preferences", security,
  responses: {
    200: { description: "Preferences", ...json(NotificationPreferenceResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "put", path: "/api/v1/notification-preferences", tags: ["Preferences"],
  summary: "Update current user's notification preferences", security,
  request: { body: json(UpdateNotificationPreferenceRef) },
  responses: {
    200: { description: "Updated", ...json(NotificationPreferenceResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/health", tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Healthy",
      content: { "application/json": { schema: z.object({ status: z.literal("ok"), service: z.string(), version: z.string() }).openapi("HealthResponse") } },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Techorbit Notification Service",
    version: "0.1.0",
    description:
      "In-app notifications + email/SMS fan-out consumers for Techorbit. Subscribes to domain events and creates per-user notifications scoped by user preferences.",
  },
  servers: [{ url: "http://localhost:3011", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

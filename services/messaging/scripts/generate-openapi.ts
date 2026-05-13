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
  CreateThreadRequestSchema,
  ErrorResponse,
  MessageResponseSchema,
  SendMessageRequestSchema,
  ThreadFilterSchema,
  ThreadListResponseSchema,
  ThreadWithMessagesResponseSchema,
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
const CreateThreadRef = registry.register("CreateThreadRequest", CreateThreadRequestSchema);
const SendMessageRef = registry.register("SendMessageRequest", SendMessageRequestSchema);
const ThreadWithMessagesRef = registry.register("ThreadWithMessagesResponse", ThreadWithMessagesResponseSchema);
const ThreadListRef = registry.register("ThreadListResponse", ThreadListResponseSchema);
const MessageResponseRef = registry.register("MessageResponse", MessageResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

registry.registerPath({
  method: "post", path: "/api/v1/threads", tags: ["Threads"],
  summary: "Create a new thread", security,
  description:
    "Participants are resolved from the context. For domain contexts (REQUIREMENT/SUBMISSION/INTERVIEW/PLACEMENT) " +
    "the participants are the caller plus primary parties on the resource. For GENERAL the caller supplies participantIds.",
  request: { body: json(CreateThreadRef) },
  responses: {
    201: { description: "Created", ...json(ThreadWithMessagesRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Caller is not a participant for this context"),
    404: err("Context not found"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/threads", tags: ["Threads"],
  summary: "List threads the current user participates in", security,
  request: { query: ThreadFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(ThreadListRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/threads/{id}", tags: ["Threads"],
  summary: "Get a thread with its messages", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Thread", ...json(ThreadWithMessagesRef) },
    401: err("Unauthorized"),
    403: err("Not a participant"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/threads/{id}/messages", tags: ["Threads"],
  summary: "Send a message to a thread", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(SendMessageRef) },
  responses: {
    201: { description: "Sent", ...json(MessageResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Not a participant"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/threads/{id}/mark-read", tags: ["Threads"],
  summary: "Mark every message in the thread as read for the current user", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Updated count",
      content: { "application/json": { schema: z.object({ updatedCount: z.number().int() }) } },
    },
    401: err("Unauthorized"),
    403: err("Not a participant"),
    404: err("Not found"),
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
    title: "Techorbit Messaging Service",
    version: "0.1.0",
    description:
      "In-platform messaging with context-aware participant resolution (requirements, submissions, interviews, placements, general). Emits message.sent.v1 via the transactional outbox for notification fan-out.",
  },
  servers: [{ url: "http://localhost:3010", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

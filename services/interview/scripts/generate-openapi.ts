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
  CancelInterviewSchema,
  ErrorResponse,
  InterviewFilterSchema,
  InterviewListResponseSchema,
  InterviewResponseSchema,
  ScheduleInterviewRequestSchema,
  ScorecardRequestSchema,
  ScorecardResponseSchema,
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
const ScheduleRef = registry.register("ScheduleInterviewRequest", ScheduleInterviewRequestSchema);
const InterviewRef = registry.register("InterviewResponse", InterviewResponseSchema);
const InterviewListRef = registry.register("InterviewListResponse", InterviewListResponseSchema);
const CancelRef = registry.register("CancelInterview", CancelInterviewSchema);
const ScorecardRequestRef = registry.register("ScorecardRequest", ScorecardRequestSchema);
const ScorecardRef = registry.register("ScorecardResponse", ScorecardResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Interviews ───────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/interviews", tags: ["Interviews"],
  summary: "Schedule an interview (CUSTOMER only)", security,
  request: { body: json(ScheduleRef) },
  responses: {
    201: { description: "Scheduled", ...json(InterviewRef) },
    400: err("Submission not in schedulable status or invalid time range"),
    401: err("Unauthorized"),
    403: err("Forbidden — only customers can schedule"),
    404: err("Submission not found"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/interviews", tags: ["Interviews"],
  summary: "List interviews (visibility-scoped)", security,
  request: { query: InterviewFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(InterviewListRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/interviews/{id}", tags: ["Interviews"],
  summary: "Get interview details", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Interview", ...json(InterviewRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not a participant"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/interviews/{id}/start", tags: ["Interviews"],
  summary: "Mark interview as started (participants only)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "In progress", ...json(InterviewRef) },
    401: err("Unauthorized"),
    403: err("Forbidden"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/interviews/{id}/end", tags: ["Interviews"],
  summary: "Mark interview as completed (participants only)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Completed", ...json(InterviewRef) },
    401: err("Unauthorized"),
    403: err("Forbidden"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/interviews/{id}/cancel", tags: ["Interviews"],
  summary: "Cancel a SCHEDULED interview (scheduler or interviewer)", security,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: json(CancelRef),
  },
  responses: {
    200: { description: "Cancelled", ...json(InterviewRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the scheduler, interviewer, or admin; or interview not in SCHEDULED"),
    404: err("Not found"),
  },
});

// ─── Scorecards ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/scorecards", tags: ["Scorecards"],
  summary: "Submit a post-interview scorecard (interviewer or scheduler)", security,
  request: { body: json(ScorecardRequestRef) },
  responses: {
    201: { description: "Submitted", ...json(ScorecardRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the interviewer or scheduler"),
    404: err("Interview not found"),
    409: err("Scorecard already submitted for this interview"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/scorecards", tags: ["Scorecards"],
  summary: "Get scorecard for an interview (scheduler and interviewer only)", security,
  request: { query: z.object({ interviewId: z.string().uuid() }) },
  responses: {
    200: { description: "Scorecard", ...json(ScorecardRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — candidates cannot read scorecards"),
    404: err("Scorecard not found"),
  },
});

// ─── Health ───────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/health", tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "Healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.literal("ok"),
            service: z.string(),
            version: z.string(),
          }).openapi("HealthResponse"),
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Techorbit Interview Service",
    version: "0.1.0",
    description:
      "Interview scheduling (SCHEDULED → IN_PROGRESS → COMPLETED | NO_SHOW | CANCELLED), " +
      "Daily.co video room management (mock mode when DAILY_API_KEY is unset), " +
      "post-interview scorecards, and transactional outbox events.",
  },
  servers: [{ url: "http://localhost:3007", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

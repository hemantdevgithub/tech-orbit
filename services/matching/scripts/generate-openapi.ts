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
  SubmissionRequestSchema,
  SubmissionResponseSchema,
  SubmissionListResponseSchema,
  SubmissionFilterSchema,
  UpdateSubmissionStatusSchema,
  WithdrawSubmissionSchema,
  MatchingSignalResponseSchema,
  MatchingSignalListResponseSchema,
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
const SubmissionRequestRef = registry.register("SubmissionRequest", SubmissionRequestSchema);
const SubmissionResponseRef = registry.register("SubmissionResponse", SubmissionResponseSchema);
const SubmissionListResponseRef = registry.register(
  "SubmissionListResponse",
  SubmissionListResponseSchema,
);
const UpdateSubmissionStatusRef = registry.register(
  "UpdateSubmissionStatus",
  UpdateSubmissionStatusSchema,
);
const WithdrawSubmissionRef = registry.register(
  "WithdrawSubmission",
  WithdrawSubmissionSchema,
);
const MatchingSignalResponseRef = registry.register(
  "MatchingSignalResponse",
  MatchingSignalResponseSchema,
);
const MatchingSignalListResponseRef = registry.register(
  "MatchingSignalListResponse",
  MatchingSignalListResponseSchema,
);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Submissions ─────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/submissions", tags: ["Submissions"],
  summary: "Create a submission", security,
  description:
    "submitterRole is derived server-side from the caller's roles (CANDIDATE / " +
    "SRM / MSME). Candidates may only submit themselves. Attribution fields " +
    "(attributedSrmId, attributedMsmeId) are set server-side based on the " +
    "submitter's role. Match score is resolved from a precomputed MatchingSignal " +
    "or computed on the fly.",
  request: { body: json(SubmissionRequestRef) },
  responses: {
    201: { description: "Submission created", ...json(SubmissionResponseRef) },
    400: err("Requirement is not OPEN, or candidate profile is incomplete"),
    401: err("Unauthorized"),
    403: err("Caller cannot submit for this candidate"),
    404: err("Requirement or candidate not found"),
    409: err("A submission for this candidate already exists"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/submissions", tags: ["Submissions"],
  summary: "List submissions with filters and cursor pagination", security,
  description:
    "Visibility-scoped: customers see submissions for their own requirements " +
    "AND their own submitted rows; candidates see only their own; admins see all.",
  request: { query: SubmissionFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(SubmissionListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/submissions/{id}", tags: ["Submissions"],
  summary: "Get a single submission", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Submission", ...json(SubmissionResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — caller is not a viewer of this submission"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "patch", path: "/api/v1/submissions/{id}/status", tags: ["Submissions"],
  summary: "Update submission status (requirement owner only)", security,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: json(UpdateSubmissionStatusRef),
  },
  responses: {
    200: { description: "Updated", ...json(SubmissionResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — only the requirement owner can update status"),
    404: err("Not found"),
    409: err("Submission is in a terminal state"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/submissions/{id}/withdraw", tags: ["Submissions"],
  summary: "Withdraw a submission (submitter only)", security,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: json(WithdrawSubmissionRef),
  },
  responses: {
    200: { description: "Withdrawn", ...json(SubmissionResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — only the submitter can withdraw"),
    404: err("Not found"),
  },
});

// ─── Matches ─────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/matches/for-requirement/{reqId}", tags: ["Matches"],
  summary: "Top-ranked MatchingSignal rows for a requirement", security,
  description:
    "Returns the top `limit` candidates ranked by matchScore. Gated on " +
    "requirement ownership, attributed CRM, or ADMIN.",
  request: {
    params: z.object({ reqId: z.string().uuid() }),
    query: z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }),
  },
  responses: {
    200: { description: "Ranked matches", ...json(MatchingSignalListResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the owner / attributed CRM"),
    404: err("Requirement not found"),
  },
});

// ─── Health ──────────────────────────────────────────────────────────────────

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
    title: "Techorbit Matching Service",
    version: "0.1.0",
    description:
      "Submission lifecycle (create → status updates → withdraw), " +
      "rule-based matching engine, event-driven precompute (requirement.published.v1), " +
      "and transactional outbox for downstream events.",
  },
  servers: [{ url: "http://localhost:3006", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

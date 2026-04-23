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
  CommissionRuleListResponseSchema,
  CreatePlacementRequestSchema,
  EndPlacementSchema,
  ErrorResponse,
  PlacementFilterSchema,
  PlacementListResponseSchema,
  PlacementResponseSchema,
  ValueChainResponseSchema,
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
const CreateReqRef = registry.register("CreatePlacementRequest", CreatePlacementRequestSchema);
const EndRef = registry.register("EndPlacement", EndPlacementSchema);
const PlacementRef = registry.register("PlacementResponse", PlacementResponseSchema);
const PlacementListRef = registry.register("PlacementListResponse", PlacementListResponseSchema);
const ValueChainRef = registry.register("ValueChainResponse", ValueChainResponseSchema);
const CommissionListRef = registry.register("CommissionRuleListResponse", CommissionRuleListResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

const CreatePlacementResultSchema = z.object({
  placement: PlacementResponseSchema,
  valueChain: ValueChainResponseSchema,
  rules: CommissionRuleListResponseSchema,
}).openapi("CreatePlacementResult");
const CreateResultRef = registry.register("CreatePlacementResult", CreatePlacementResultSchema);

// ─── Placements ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/placements", tags: ["Placements"],
  summary: "Create a placement (CUSTOMER only)", security,
  description:
    "Materializes the Value Chain (customer → CRM → SRM → candidate/MSME + " +
    "interviewers) and generates CommissionRules in a single transaction. " +
    "Attribution is resolved server-side from the submission, requirement, " +
    "and completed interviews. Submission must be in OFFER status.",
  request: { body: json(CreateReqRef) },
  responses: {
    201: { description: "Placement created", ...json(CreateResultRef) },
    400: err("Submission not in OFFER status or invalid engagement config"),
    401: err("Unauthorized"),
    403: err("Forbidden — only the requirement owner (customer) can create a placement"),
    404: err("Submission or requirement not found"),
    409: err("A placement already exists for this submission"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/placements", tags: ["Placements"],
  summary: "List placements (participant-scoped visibility)", security,
  request: { query: PlacementFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(PlacementListRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/placements/{id}", tags: ["Placements"],
  summary: "Get placement details", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Placement", ...json(PlacementRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not a participant"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/placements/{id}/value-chain", tags: ["Placements"],
  summary: "Get the Value Chain (visibility-filtered per viewer role)", security,
  description:
    "Returns the attribution graph filtered by the caller's role:\n" +
    "- CUSTOMER (owner) / ADMIN: sees everything\n" +
    "- CRM: sees customer + candidate + own slot; SRM/MSME/interviewers hidden\n" +
    "- SRM: sees customer + candidate + own slot; CRM/MSME hidden\n" +
    "- MSME: sees customer + candidate + SRM + own residual\n" +
    "- CANDIDATE: sees customer + own pay rate (W-2) / MSME (C2C)\n" +
    "- INTERVIEWER: sees customer + candidate + own fee\n\n" +
    "Hidden slots are returned as `null` and listed in `redactedSlots` so the " +
    "UI can render 'Confidential' placeholders.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Filtered Value Chain", ...json(ValueChainRef) },
    401: err("Unauthorized"),
    403: err("Forbidden"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/placements/{id}/commissions", tags: ["Placements"],
  summary: "Get commission rules (visibility-filtered per viewer role)", security,
  description:
    "Commission rules filtered the same way as the Value Chain. Each rule " +
    "includes a computed `projectedHourlyUsd` for display.",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Filtered commission rules", ...json(CommissionListRef) },
    401: err("Unauthorized"),
    403: err("Forbidden"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/placements/{id}/end", tags: ["Placements"],
  summary: "End a placement (customer only)", security,
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: json(registry.register("EndPlacementBody", EndPlacementSchema)),
  },
  responses: {
    200: { description: "Ended", ...json(PlacementRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the customer, or placement not ACTIVE"),
    404: err("Not found"),
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
    title: "Techorbit Placement Service",
    version: "0.1.0",
    description:
      "Placement lifecycle (create → active → ended), Value Chain " +
      "materialization (who contributed to this hire), and rule-based " +
      "commission calculation.\n\n" +
      "Commission weights for v1: CRM 8%, SRM 5%, Platform 12% (W-2 residual, " +
      "C2C fixed), Candidate pay rate percent (W-2), MSME residual (C2C). " +
      "When a CRM or SRM attribution slot is empty, the share flows to the " +
      "Platform in W-2 (residual calculation) — keeping the 100% sum invariant.",
  },
  servers: [{ url: "http://localhost:3008", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

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
  AttributeCrmSchema,
  CloseRequirementSchema,
  CrmAttributionRequestResponseSchema,
  CreateRequirementSchema,
  ErrorResponse,
  RequirementFilterSchema,
  RequirementListResponseSchema,
  RequirementResponseSchema,
  UpdateRequirementSchema,
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
const CreateRequirementRef = registry.register("CreateRequirement", CreateRequirementSchema);
const UpdateRequirementRef = registry.register("UpdateRequirement", UpdateRequirementSchema);
const CloseRequirementRef = registry.register("CloseRequirement", CloseRequirementSchema);
const RequirementResponseRef = registry.register("RequirementResponse", RequirementResponseSchema);
const RequirementListResponseRef = registry.register("RequirementListResponse", RequirementListResponseSchema);
const AttributeCrmRef = registry.register("AttributeCrm", AttributeCrmSchema);
const CrmAttributionRequestResponseRef = registry.register("CrmAttributionRequestResponse", CrmAttributionRequestResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Requirements ─────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/requirements", tags: ["Requirements"],
  summary: "Create a draft requirement (CUSTOMER role required)", security,
  description:
    "Creates a DRAFT requirement. customerCompanyId is derived server-side from the " +
    "caller's CustomerCompanyProfile — callers do not supply it in the request body.",
  request: { body: json(CreateRequirementRef) },
  responses: {
    201: { description: "Draft created", ...json(RequirementResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not a CUSTOMER, or profile not complete"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/requirements", tags: ["Requirements"],
  summary: "Browse requirements with filters and cursor pagination", security,
  description:
    "Non-admin users see only published requirements plus their own drafts. " +
    "CRMs also see requirements where they are the attributed CRM.",
  request: { query: RequirementFilterSchema },
  responses: {
    200: { description: "Paginated list", ...json(RequirementListResponseRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/requirements/{id}", tags: ["Requirements"],
  summary: "Get a single requirement", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Requirement", ...json(RequirementResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — draft not owned by caller"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "patch", path: "/api/v1/requirements/{id}", tags: ["Requirements"],
  summary: "Update a draft requirement (owner only)", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateRequirementRef) },
  responses: {
    200: { description: "Updated", ...json(RequirementResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the owner or not in DRAFT"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/requirements/{id}/publish", tags: ["Requirements"],
  summary: "Publish a draft requirement (DRAFT → OPEN)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Published", ...json(RequirementResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the owner"),
    404: err("Not found"),
    409: err("Not in DRAFT status"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/requirements/{id}/close", tags: ["Requirements"],
  summary: "Close a requirement with a reason (owner only)", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(CloseRequirementRef) },
  responses: {
    200: { description: "Closed", ...json(RequirementResponseRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
    403: err("Forbidden — not the owner"),
    404: err("Not found"),
  },
});

// ─── CRM Attribution ──────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/requirements/{id}/attribute-crm", tags: ["CRM Attribution"],
  summary: "CRM claims attribution on a requirement", security,
  description:
    "Three outcomes: (1) 200 — CRM is already attributed; (2) 200 — customer already has this " +
    "CRM linked, auto-confirmed; (3) 202 — pending customer approval.",
  request: { params: z.object({ id: z.string().uuid() }), body: json(AttributeCrmRef) },
  responses: {
    200: { description: "Attributed (auto-confirmed)" },
    202: { description: "Pending customer approval", ...json(CrmAttributionRequestResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not a CRM role"),
    404: err("Requirement not found"),
    409: err("Another CRM is already attributed"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/crm-attribution-requests", tags: ["CRM Attribution"],
  summary: "List pending CRM attribution requests for the caller's company (CUSTOMER only)", security,
  responses: {
    200: {
      description: "Attribution queue",
      content: { "application/json": { schema: z.object({ data: z.array(CrmAttributionRequestResponseRef) }) } },
    },
    401: err("Unauthorized"),
    403: err("Forbidden — not a CUSTOMER"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/crm-attribution-requests/{id}/approve", tags: ["CRM Attribution"],
  summary: "Approve a pending CRM attribution request (CUSTOMER only)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Approved", ...json(CrmAttributionRequestResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the owning customer"),
    404: err("Request not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/crm-attribution-requests/{id}/reject", tags: ["CRM Attribution"],
  summary: "Reject a pending CRM attribution request (CUSTOMER only)", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Rejected", ...json(CrmAttributionRequestResponseRef) },
    401: err("Unauthorized"),
    403: err("Forbidden — not the owning customer"),
    404: err("Request not found"),
  },
});

// ─── Health ───────────────────────────────────────────────────────────────────

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

// ─── Generate ─────────────────────────────────────────────────────────────────

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Techorbit Requirement Service",
    version: "0.1.0",
    description:
      "Requirement lifecycle (draft → publish → close), blind-posting, CRM attribution, " +
      "and outbox-based events for the Techorbit staffing marketplace.",
  },
  servers: [{ url: "http://localhost:3005", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

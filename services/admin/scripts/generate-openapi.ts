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
  AddDisputeNoteSchema,
  ApproveApplicationSchema,
  AuditLogFilterSchema,
  AuditLogListResponseSchema,
  BanUserSchema,
  CreateDisputeRequestSchema,
  DashboardMetricsResponseSchema,
  DisputeFilterSchema,
  DisputeListResponseSchema,
  DisputeNoteResponseSchema,
  DisputeResponseSchema,
  ErrorResponse,
  RejectApplicationSchema,
  ResolveDisputeSchema,
  RoleApplicationFilterSchema,
  RoleApplicationListResponseSchema,
  RoleApplicationRequestSchema,
  RoleApplicationResponseSchema,
  SuspendUserSchema,
  UserSearchResponseSchema,
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
const RoleApplicationReqRef = registry.register("RoleApplicationRequest", RoleApplicationRequestSchema);
const ApproveAppRef = registry.register("ApproveApplication", ApproveApplicationSchema);
const RejectAppRef = registry.register("RejectApplication", RejectApplicationSchema);
const RoleApplicationRef = registry.register("RoleApplicationResponse", RoleApplicationResponseSchema);
const RoleApplicationListRef = registry.register("RoleApplicationListResponse", RoleApplicationListResponseSchema);
const CreateDisputeRef = registry.register("CreateDisputeRequest", CreateDisputeRequestSchema);
const ResolveDisputeRef = registry.register("ResolveDispute", ResolveDisputeSchema);
const AddDisputeNoteRef = registry.register("AddDisputeNote", AddDisputeNoteSchema);
const DisputeRef = registry.register("DisputeResponse", DisputeResponseSchema);
const DisputeNoteRef = registry.register("DisputeNoteResponse", DisputeNoteResponseSchema);
const DisputeListRef = registry.register("DisputeListResponse", DisputeListResponseSchema);
const SuspendUserRef = registry.register("SuspendUser", SuspendUserSchema);
const BanUserRef = registry.register("BanUser", BanUserSchema);
const UserSearchRef = registry.register("UserSearchResponse", UserSearchResponseSchema);
const AuditLogListRef = registry.register("AuditLogListResponse", AuditLogListResponseSchema);
const DashboardMetricsRef = registry.register("DashboardMetricsResponse", DashboardMetricsResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Role applications ───────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/role-applications", tags: ["Role Applications"],
  summary: "Submit a role application", security,
  request: { body: json(RoleApplicationReqRef) },
  responses: {
    201: { description: "Created", ...json(RoleApplicationRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/role-applications", tags: ["Role Applications"],
  summary: "List applications (admin: all, user: own)", security,
  request: { query: RoleApplicationFilterSchema },
  responses: {
    200: { description: "List", ...json(RoleApplicationListRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/role-applications/{id}", tags: ["Role Applications"],
  summary: "Get an application", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Application", ...json(RoleApplicationRef) },
    401: err("Unauthorized"),
    403: err("Not authorized"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/role-applications/{id}/approve", tags: ["Role Applications"],
  summary: "Approve a pending application (ADMIN)", security,
  description: "Calls identity-svc internal endpoint to grant the role, then writes audit log and emits role.approved.v1.",
  request: { params: z.object({ id: z.string().uuid() }), body: json(ApproveAppRef) },
  responses: {
    200: { description: "Approved", ...json(RoleApplicationRef) },
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("Not found"),
    409: err("Not in PENDING status"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/role-applications/{id}/reject", tags: ["Role Applications"],
  summary: "Reject a pending application (ADMIN)", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(RejectAppRef) },
  responses: {
    200: { description: "Rejected", ...json(RoleApplicationRef) },
    400: err("Review notes required"),
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("Not found"),
    409: err("Not in PENDING status"),
  },
});

// ─── Disputes ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/disputes", tags: ["Disputes"],
  summary: "Create a dispute", security,
  request: { body: json(CreateDisputeRef) },
  responses: {
    201: { description: "Created", ...json(DisputeRef) },
    400: err("Validation error"),
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/disputes", tags: ["Disputes"],
  summary: "List disputes (admin: all, user: own)", security,
  request: { query: DisputeFilterSchema },
  responses: {
    200: { description: "List", ...json(DisputeListRef) },
    401: err("Unauthorized"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/disputes/{id}", tags: ["Disputes"],
  summary: "Get a dispute with notes", security,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Dispute", ...json(DisputeRef) },
    401: err("Unauthorized"),
    403: err("Not authorized"),
    404: err("Not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/disputes/{id}/notes", tags: ["Disputes"],
  summary: "Add a note to a dispute", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(AddDisputeNoteRef) },
  responses: {
    201: { description: "Note created", ...json(DisputeNoteRef) },
    401: err("Unauthorized"),
    403: err("Not a participant"),
    404: err("Not found"),
    409: err("Dispute resolved/closed"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/disputes/{id}/resolve", tags: ["Disputes"],
  summary: "Resolve a dispute (ADMIN)", security,
  request: { params: z.object({ id: z.string().uuid() }), body: json(ResolveDisputeRef) },
  responses: {
    200: { description: "Resolved", ...json(DisputeRef) },
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("Not found"),
    409: err("Already resolved/closed"),
  },
});

// ─── User management ─────────────────────────────────────────────────────────

registry.registerPath({
  method: "post", path: "/api/v1/admin/users/{userId}/suspend", tags: ["User Management"],
  summary: "Suspend a user (ADMIN)", security,
  description: "Calls identity-svc to flip User.status=SUSPENDED and revoke active sessions.",
  request: { params: z.object({ userId: z.string().uuid() }), body: json(SuspendUserRef) },
  responses: {
    200: { description: "Suspended" },
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("User not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/admin/users/{userId}/ban", tags: ["User Management"],
  summary: "Ban a user (ADMIN)", security,
  description: "Same effect as suspend at the auth layer; the distinction is preserved in the audit log and user.banned.v1 event.",
  request: { params: z.object({ userId: z.string().uuid() }), body: json(BanUserRef) },
  responses: {
    200: { description: "Banned" },
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("User not found"),
  },
});

registry.registerPath({
  method: "post", path: "/api/v1/admin/users/{userId}/reset-password", tags: ["User Management"],
  summary: "Trigger password reset email (ADMIN)", security,
  request: { params: z.object({ userId: z.string().uuid() }) },
  responses: {
    200: { description: "Email sent" },
    401: err("Unauthorized"),
    403: err("Admin role required"),
    404: err("User not found"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/admin/users/search", tags: ["User Management"],
  summary: "Search users by email/name (ADMIN)", security,
  request: { query: z.object({ q: z.string().min(1) }) },
  responses: {
    200: { description: "Results", ...json(UserSearchRef) },
    401: err("Unauthorized"),
    403: err("Admin role required"),
  },
});

// ─── Audit + Dashboard ───────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/admin/audit-logs", tags: ["Audit"],
  summary: "List audit log entries (ADMIN)", security,
  request: { query: AuditLogFilterSchema },
  responses: {
    200: { description: "Logs", ...json(AuditLogListRef) },
    401: err("Unauthorized"),
    403: err("Admin role required"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/admin/dashboard/metrics", tags: ["Dashboard"],
  summary: "Get dashboard metrics (ADMIN)", security,
  responses: {
    200: { description: "Metrics", ...json(DashboardMetricsRef) },
    401: err("Unauthorized"),
    403: err("Admin role required"),
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
    title: "Techorbit Admin Service",
    version: "0.1.0",
    description:
      "Admin console backend: role-application approval/rejection, dispute resolution, user management, audit logs, dashboard metrics.",
  },
  servers: [{ url: "http://localhost:3014", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

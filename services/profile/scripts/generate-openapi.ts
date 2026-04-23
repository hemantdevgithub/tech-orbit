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
  CandidateProfileResponseSchema,
  CustomerCompanyResponseSchema,
  CreateCustomerCompanySchema,
  UpdateCustomerCompanySchema,
  UpdateCandidateProfileSchema,
  MsmeProfileResponseSchema,
  CreateMsmeProfileSchema,
  UpdateMsmeProfileSchema,
  BenchEntryResponseSchema,
  AddBenchEntrySchema,
  InterviewerProfileResponseSchema,
  CreateInterviewerProfileSchema,
  UpdateInterviewerProfileSchema,
  SetAvailabilitySchema,
  FileUploadUrlRequestSchema,
  FileUploadUrlResponseSchema,
  ErrorResponse,
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
const CandidateProfileRef = registry.register("CandidateProfileResponse", CandidateProfileResponseSchema);
const UpdateCandidateRef = registry.register("UpdateCandidateProfile", UpdateCandidateProfileSchema);
const CustomerCompanyRef = registry.register("CustomerCompanyResponse", CustomerCompanyResponseSchema);
const CreateCustomerRef = registry.register("CreateCustomerCompany", CreateCustomerCompanySchema);
const UpdateCustomerRef = registry.register("UpdateCustomerCompany", UpdateCustomerCompanySchema);
const AttributeCrmRef = registry.register("AttributeCrm", AttributeCrmSchema);
const MsmeProfileRef = registry.register("MsmeProfileResponse", MsmeProfileResponseSchema);
const CreateMsmeRef = registry.register("CreateMsmeProfile", CreateMsmeProfileSchema);
const UpdateMsmeRef = registry.register("UpdateMsmeProfile", UpdateMsmeProfileSchema);
const BenchEntryRef = registry.register("BenchEntryResponse", BenchEntryResponseSchema);
const AddBenchEntryRef = registry.register("AddBenchEntry", AddBenchEntrySchema);
const InterviewerProfileRef = registry.register("InterviewerProfileResponse", InterviewerProfileResponseSchema);
const CreateInterviewerRef = registry.register("CreateInterviewerProfile", CreateInterviewerProfileSchema);
const UpdateInterviewerRef = registry.register("UpdateInterviewerProfile", UpdateInterviewerProfileSchema);
const SetAvailabilityRef = registry.register("SetAvailability", SetAvailabilitySchema);
const FileUploadUrlRequestRef = registry.register("FileUploadUrlRequest", FileUploadUrlRequestSchema);
const FileUploadUrlResponseRef = registry.register("FileUploadUrlResponse", FileUploadUrlResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

// ─── Candidate ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/candidates/me", tags: ["Candidate"],
  summary: "Get own candidate profile", security,
  responses: { 200: { description: "Profile", ...json(CandidateProfileRef) }, 401: err("Unauthorized"), 404: err("Profile not found") },
});
registry.registerPath({
  method: "patch", path: "/api/v1/candidates/me", tags: ["Candidate"],
  summary: "Update own candidate profile", security,
  request: { body: json(UpdateCandidateRef) },
  responses: { 200: { description: "Updated", ...json(CandidateProfileRef) }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "get", path: "/api/v1/candidates/{userId}", tags: ["Candidate"],
  summary: "Get a candidate profile by userId (admin/CRM/SRM)", security,
  request: { params: z.object({ userId: z.string().uuid() }) },
  responses: { 200: { description: "Profile", ...json(CandidateProfileRef) }, 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("Not found") },
});
registry.registerPath({
  method: "post", path: "/api/v1/candidates/me/resume", tags: ["Candidate"],
  summary: "Request a presigned URL for resume upload", security,
  request: { body: json(FileUploadUrlRequestRef) },
  responses: { 200: { description: "Presigned URL", ...json(FileUploadUrlResponseRef) }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "post", path: "/api/v1/candidates/me/kyc/start", tags: ["Candidate"],
  summary: "Start KYC identity verification", security,
  responses: { 200: { description: "KYC session started" }, 401: err("Unauthorized") },
});

// ─── Customer Company ─────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/customers/me", tags: ["Customer"],
  summary: "Get own customer company profile", security,
  responses: { 200: { description: "Profile", ...json(CustomerCompanyRef) }, 401: err("Unauthorized"), 404: err("Not found") },
});
registry.registerPath({
  method: "post", path: "/api/v1/customers/me", tags: ["Customer"],
  summary: "Create customer company profile", security,
  request: { body: json(CreateCustomerRef) },
  responses: { 201: { description: "Created", ...json(CustomerCompanyRef) }, 400: err("Validation error"), 401: err("Unauthorized"), 409: err("Profile already exists") },
});
registry.registerPath({
  method: "patch", path: "/api/v1/customers/me", tags: ["Customer"],
  summary: "Update customer company profile", security,
  request: { body: json(UpdateCustomerRef) },
  responses: { 200: { description: "Updated", ...json(CustomerCompanyRef) }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "get", path: "/api/v1/customers/{primaryUserId}", tags: ["Customer"],
  summary: "Get a customer profile by primaryUserId (admin/CRM view)", security,
  request: { params: z.object({ primaryUserId: z.string().uuid() }) },
  responses: { 200: { description: "Profile", ...json(CustomerCompanyRef) }, 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("Not found") },
});
registry.registerPath({
  method: "post", path: "/api/v1/customers/{primaryUserId}/crm", tags: ["Customer"],
  summary: "Attribute a CRM to a customer company", security,
  request: { params: z.object({ primaryUserId: z.string().uuid() }), body: json(AttributeCrmRef) },
  responses: { 200: { description: "CRM attributed", ...json(CustomerCompanyRef) }, 401: err("Unauthorized"), 404: err("Not found") },
});

// ─── MSME ─────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/msme/me", tags: ["MSME"],
  summary: "Get own MSME profile", security,
  responses: { 200: { description: "Profile", ...json(MsmeProfileRef) }, 401: err("Unauthorized"), 404: err("Not found") },
});
registry.registerPath({
  method: "post", path: "/api/v1/msme/me", tags: ["MSME"],
  summary: "Create MSME profile", security,
  request: { body: json(CreateMsmeRef) },
  responses: { 201: { description: "Created", ...json(MsmeProfileRef) }, 400: err("Validation error"), 401: err("Unauthorized") },
});
registry.registerPath({
  method: "patch", path: "/api/v1/msme/me", tags: ["MSME"],
  summary: "Update MSME profile", security,
  request: { body: json(UpdateMsmeRef) },
  responses: { 200: { description: "Updated", ...json(MsmeProfileRef) }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "get", path: "/api/v1/msme/{ownerUserId}", tags: ["MSME"],
  summary: "Get MSME profile by owner userId (admin/CRM view)", security,
  request: { params: z.object({ ownerUserId: z.string().uuid() }) },
  responses: { 200: { description: "Profile", ...json(MsmeProfileRef) }, 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("Not found") },
});
registry.registerPath({
  method: "get", path: "/api/v1/msme/me/bench", tags: ["MSME"],
  summary: "List bench entries", security,
  responses: { 200: { description: "Bench entries", content: { "application/json": { schema: z.object({ data: z.array(BenchEntryRef) }) } } }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "post", path: "/api/v1/msme/me/bench", tags: ["MSME"],
  summary: "Add a bench entry", security,
  request: { body: json(AddBenchEntryRef) },
  responses: { 201: { description: "Created", ...json(BenchEntryRef) }, 400: err("Validation error"), 401: err("Unauthorized") },
});
registry.registerPath({
  method: "delete", path: "/api/v1/msme/me/bench/{entryId}", tags: ["MSME"],
  summary: "Remove a bench entry", security,
  request: { params: z.object({ entryId: z.string().uuid() }) },
  responses: { 200: { description: "Deleted" }, 401: err("Unauthorized"), 404: err("Not found") },
});

// ─── Interviewer ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get", path: "/api/v1/interviewers/me", tags: ["Interviewer"],
  summary: "Get own interviewer profile", security,
  responses: { 200: { description: "Profile", ...json(InterviewerProfileRef) }, 401: err("Unauthorized"), 404: err("Not found") },
});
registry.registerPath({
  method: "post", path: "/api/v1/interviewers/me", tags: ["Interviewer"],
  summary: "Create interviewer profile", security,
  request: { body: json(CreateInterviewerRef) },
  responses: { 201: { description: "Created", ...json(InterviewerProfileRef) }, 400: err("Validation error"), 401: err("Unauthorized") },
});
registry.registerPath({
  method: "patch", path: "/api/v1/interviewers/me", tags: ["Interviewer"],
  summary: "Update interviewer profile", security,
  request: { body: json(UpdateInterviewerRef) },
  responses: { 200: { description: "Updated", ...json(InterviewerProfileRef) }, 401: err("Unauthorized") },
});
registry.registerPath({
  method: "get", path: "/api/v1/interviewers/{userId}", tags: ["Interviewer"],
  summary: "Get interviewer profile by userId", security,
  request: { params: z.object({ userId: z.string().uuid() }) },
  responses: { 200: { description: "Profile", ...json(InterviewerProfileRef) }, 401: err("Unauthorized"), 403: err("Forbidden"), 404: err("Not found") },
});
registry.registerPath({
  method: "put", path: "/api/v1/interviewers/me/availability", tags: ["Interviewer"],
  summary: "Set availability slots", security,
  request: { body: json(SetAvailabilityRef) },
  responses: { 200: { description: "Updated" }, 401: err("Unauthorized") },
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
    title: "Techorbit Profile Service",
    version: "0.1.0",
    description: "Candidate, customer company, MSME, and interviewer profile management.",
  },
  servers: [{ url: "http://localhost:3004", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

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
  RatingFilterSchema,
  RatingListResponseSchema,
  RatingResponseSchema,
  SubmitRatingRequestSchema,
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
const SubmitRatingRef = registry.register("SubmitRatingRequest", SubmitRatingRequestSchema);
const RatingResponseRef = registry.register("RatingResponse", RatingResponseSchema);
const RatingListResponseRef = registry.register("RatingListResponse", RatingListResponseSchema);

const json = (s: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: s } },
});
const err = (d: string) => ({ description: d, ...json(ErrorRef) });

registry.registerPath({
  method: "post", path: "/api/v1/ratings", tags: ["Ratings"],
  summary: "Submit a rating on a completed placement", security,
  description:
    "Only the customer (creator) or candidate on the placement can rate their counterpart. " +
    "Placement must be ENDED_COMPLETED. One rating per placement per rater (unique constraint).",
  request: { body: json(SubmitRatingRef) },
  responses: {
    201: { description: "Created", ...json(RatingResponseRef) },
    400: err("Validation error (self-rating, wrong target, placement not ended)"),
    401: err("Unauthorized"),
    403: err("Caller is not a participant on the placement"),
    404: err("Placement not found"),
    409: err("Already rated"),
  },
});

registry.registerPath({
  method: "get", path: "/api/v1/ratings", tags: ["Ratings"],
  summary: "List ratings for a user or placement", security,
  description: "Exactly one of userId or placementId must be provided. userId response includes aggregate averages.",
  request: { query: RatingFilterSchema },
  responses: {
    200: { description: "List with aggregates", ...json(RatingListResponseRef) },
    400: err("Validation error — userId or placementId required"),
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
    title: "Techorbit Rating Service",
    version: "0.1.0",
    description:
      "Post-placement ratings (customer ↔ candidate). Emits rating.submitted.v1 via the transactional outbox.",
  },
  servers: [{ url: "http://localhost:3012", description: "Local dev" }],
});

const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);

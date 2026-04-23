import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// Singleton registry — each service's generate-openapi.ts imports this,
// registers its own route paths, then calls generateDocument.
export const registry = new OpenAPIRegistry();

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateCustomerCompanySchema,
  UpdateCustomerCompanySchema,
  AttributeCrmSchema,
} from "@techorbit/types";
import type { CustomerService } from "../services/customer.service.js";

export async function customerRoutes(
  fastify: FastifyInstance,
  options: { customerService: CustomerService },
): Promise<void> {
  const { customerService } = options;

  // GET /api/v1/customers/me
  fastify.get(
    "/api/v1/customers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const profile = await customerService.getProfile(request.auth, request.auth.userId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/customers/me
  fastify.post(
    "/api/v1/customers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateCustomerCompanySchema.parse(request.body);
      const profile = await customerService.createProfile(request.auth, request.auth.userId, body);
      return reply.status(201).send(profile);
    },
  );

  // PATCH /api/v1/customers/me
  fastify.patch(
    "/api/v1/customers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = UpdateCustomerCompanySchema.parse(request.body);
      const profile = await customerService.updateProfile(request.auth, request.auth.userId, body);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/customers/:primaryUserId  (admin/CRM view — full profile with PII)
  fastify.get(
    "/api/v1/customers/:primaryUserId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { primaryUserId } = z
        .object({ primaryUserId: z.string().uuid() })
        .parse(request.params);
      const profile = await customerService.getProfile(request.auth, primaryUserId);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/customers/:primaryUserId/public  (any authenticated user — no PII)
  fastify.get(
    "/api/v1/customers/:primaryUserId/public",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { primaryUserId } = z
        .object({ primaryUserId: z.string().uuid() })
        .parse(request.params);
      const profile = await customerService.getPublicProfile(primaryUserId);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/customers/by-company/:companyId/public
  // Value-chain + placement rows expose customerCompanyId (not user id);
  // this endpoint resolves those to the company's public profile.
  fastify.get(
    "/api/v1/customers/by-company/:companyId/public",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { companyId } = z
        .object({ companyId: z.string().uuid() })
        .parse(request.params);
      const profile = await customerService.getPublicProfileByCompany(companyId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/customers/:primaryUserId/crm
  fastify.post(
    "/api/v1/customers/:primaryUserId/crm",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { primaryUserId } = z
        .object({ primaryUserId: z.string().uuid() })
        .parse(request.params);
      const { crmUserId } = AttributeCrmSchema.parse(request.body);
      const profile = await customerService.attributeCrm(request.auth, primaryUserId, crmUserId);
      return reply.status(200).send(profile);
    },
  );
}

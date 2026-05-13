import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  RejectTimesheetSchema,
  SubmitTimesheetRequestSchema,
  TimesheetFilterSchema,
  UpdateTimesheetSchema,
} from "@techorbit/types";
import type { TimesheetService } from "../services/timesheet.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function timesheetRoutes(
  fastify: FastifyInstance,
  options: { timesheetService: TimesheetService },
): Promise<void> {
  const { timesheetService } = options;

  fastify.post(
    "/api/v1/timesheets",
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const body = SubmitTimesheetRequestSchema.parse(request.body);
      const result = await timesheetService.submitTimesheet(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    "/api/v1/timesheets",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = TimesheetFilterSchema.parse(request.query);
      const result = await timesheetService.listTimesheets(request.auth, filters);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/timesheets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await timesheetService.getTimesheet(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.patch(
    "/api/v1/timesheets/:id",
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = UpdateTimesheetSchema.parse(request.body);
      const result = await timesheetService.updateTimesheet(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/timesheets/:id/approve",
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 120,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await timesheetService.approveTimesheet(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/timesheets/:id/reject",
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 120,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = RejectTimesheetSchema.parse(request.body);
      const result = await timesheetService.rejectTimesheet(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );
}

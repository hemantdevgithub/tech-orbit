import type { FastifyInstance } from "fastify";
import { RatingFilterSchema, SubmitRatingRequestSchema } from "@techorbit/types";
import type { RatingService } from "../services/rating.service.js";

export async function ratingRoutes(
  fastify: FastifyInstance,
  options: { ratingService: RatingService },
): Promise<void> {
  const { ratingService } = options;

  fastify.post(
    "/api/v1/ratings",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = SubmitRatingRequestSchema.parse(request.body);
      const result = await ratingService.submit(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    "/api/v1/ratings",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = RatingFilterSchema.parse(request.query);
      const result = await ratingService.list(filter);
      return reply.status(200).send(result);
    },
  );
}

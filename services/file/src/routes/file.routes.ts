import type { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs";
import { FilePurpose } from "../generated/client/index.js";
import { FileUploadUrlRequestSchema } from "@techorbit/types";
import { createFileService } from "../services/file.service.js";
import type { Config } from "../config.js";

export async function fileRoutes(
  fastify: FastifyInstance,
  options: { config: Config },
): Promise<void> {
  const fileService = createFileService(options.config);

  // POST /api/v1/files/upload-url
  fastify.post(
    "/api/v1/files/upload-url",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = FileUploadUrlRequestSchema.parse(request.body);
      const { userId } = request.auth;

      const result = await fileService.requestUploadUrl(
        userId,
        body.filename,
        body.contentType,
        body.sizeBytes,
        body.purpose as FilePurpose,
      );

      return reply.status(201).send(result);
    },
  );

  // PUT /api/v1/files/:id/upload  (local storage only — replaces presigned S3 PUT)
  fastify.put(
    "/api/v1/files/:id/upload",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { userId } = request.auth;

      const data = await request.body as Buffer;
      await fileService.handleLocalUpload(id, userId, data);

      return reply.status(204).send();
    },
  );

  // POST /api/v1/files/:id/confirm
  fastify.post(
    "/api/v1/files/:id/confirm",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { userId } = request.auth;

      const file = await fileService.confirmUpload(id, userId);
      return reply.status(200).send(file);
    },
  );

  // GET /api/v1/files/:id
  fastify.get(
    "/api/v1/files/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { userId } = request.auth;

      const file = await fileService.getById(id, userId);
      return reply.status(200).send(file);
    },
  );

  // GET /api/v1/files/:id/download-url
  fastify.get(
    "/api/v1/files/:id/download-url",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { userId } = request.auth;

      const url = await fileService.getDownloadUrl(id, userId);
      return reply.status(200).send({ downloadUrl: url });
    },
  );

  // GET /api/v1/files/:id/serve  (local storage serving — no auth required for direct link)
  fastify.get(
    "/api/v1/files/:id/serve",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const { userId } = request.auth;

      const file = await fileService.getById(id, userId);
      if (!file.downloadUrl) {
        return reply.status(400).send({ error: { code: "FILE_NOT_READY", message: "File not confirmed" } });
      }

      // Resolve local path from config
      const record = await import("../lib/prisma.js").then((m) =>
        m.prisma.fileRecord.findUnique({ where: { id } }),
      );
      if (!record?.localPath) {
        return reply.status(404).send({ error: { code: "FILE_NOT_FOUND", message: "File not found" } });
      }

      const stream = fs.createReadStream(record.localPath);
      return reply.type(record.contentType).send(stream);
    },
  );
}

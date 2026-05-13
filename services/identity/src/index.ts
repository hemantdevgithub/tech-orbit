import { buildServer } from "./server.js";
import { startOutboxWorker, stopOutboxWorker } from "./lib/outbox-worker.js";
import { prisma } from "./lib/prisma.js";

const fastify = await buildServer();

const config = await import("./config.js").then((m) => m.getConfig());

// Start outbox worker if RabbitMQ is configured
if (config.RABBITMQ_URL) {
  await startOutboxWorker(config.RABBITMQ_URL);
}

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    stopOutboxWorker();
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

await fastify.listen({ host: "0.0.0.0", port: config.PORT });
fastify.log.info({ port: config.PORT }, "Identity service started");

import { buildServer } from "./server.js";
import { getConfig } from "./config.js";

const fastify = await buildServer();

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
}

const config = getConfig();
await fastify.listen({ host: "0.0.0.0", port: config.PORT });

import { buildServer } from "./server.js";
import { getConfig } from "./config.js";

const config = getConfig();

buildServer()
  .then((fastify) => {
    fastify.listen({ port: config.PORT, host: "0.0.0.0" }, (err) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    });
  })
  .catch((err: unknown) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

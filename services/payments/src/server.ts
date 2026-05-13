import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";
import { getConfig } from "./config.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { createPlacementApi } from "./lib/placement-api.js";
import { createProfileApi } from "./lib/profile-api.js";
import { createStripeMock } from "./lib/stripe-mock.js";
import { createGustoMock } from "./lib/gusto-mock.js";
import { createTimesheetService } from "./services/timesheet.service.js";
import { createInvoiceGeneratorService } from "./services/invoice-generator.service.js";
import { createPayoutProcessorService } from "./services/payout-processor.service.js";
import { createInvoiceService } from "./services/invoice.service.js";
import { createPayoutService } from "./services/payout.service.js";
import { timesheetRoutes } from "./routes/timesheet.routes.js";
import { invoiceRoutes } from "./routes/invoice.routes.js";
import { payoutRoutes } from "./routes/payout.routes.js";
import { internalPaymentsRoutes } from "./routes/internal.routes.js";
import { registerPlacementCreatedConsumer } from "./consumers/placement-created.consumer.js";
import { startOutboxWorker, stopOutboxWorker } from "./lib/outbox-worker.js";
import { startWeeklyInvoiceCron, stopWeeklyInvoiceCron } from "./jobs/weekly-invoice-cron.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      name: config.SERVICE_NAME,
      serializers: {
        req: (req) => ({ url: req.url, method: req.method }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  });

  const publicPem = config.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
  await fastify.register(cors, {
    origin: config.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  await fastify.register(helmet);
  if (!config.DISABLE_RATE_LIMIT) {
    await fastify.register(rateLimit, { global: false });
  }

  await createAuthMiddleware(fastify, {
    publicKey: publicPem,
    verifyOptions: { algorithms: ["RS256"], clockTolerance: 30 },
  });

  // Clients
  const signer = createServiceTokenSigner(config.JWT_PRIVATE_KEY, config.SERVICE_NAME);
  const placementApi = createPlacementApi(config.PLACEMENT_SVC_URL, signer);
  const profileApi = createProfileApi(config.PROFILE_SVC_URL, signer);
  const stripe = createStripeMock(fastify.log);
  const gusto = createGustoMock(fastify.log);

  // Services
  const invoiceGeneratorService = createInvoiceGeneratorService({ placementApi, logger: fastify.log });
  const payoutProcessor = createPayoutProcessorService({ gusto, stripe, logger: fastify.log });
  const timesheetService = createTimesheetService({ placementApi });
  const invoiceService = createInvoiceService({ profileApi, payoutProcessor, logger: fastify.log });
  const payoutService = createPayoutService();

  // Routes
  await fastify.register(timesheetRoutes, { timesheetService });
  await fastify.register(invoiceRoutes, { invoiceService });
  await fastify.register(payoutRoutes, { payoutService });
  await fastify.register(internalPaymentsRoutes, { invoiceGeneratorService });

  if (config.RABBITMQ_URL) {
    const eventBus = createEventBus(
      { url: config.RABBITMQ_URL, exchange: "techorbit.events" },
      config.SERVICE_NAME,
    );
    fastify.addHook("onReady", async () => {
      await eventBus.connect();
      await registerPlacementCreatedConsumer(eventBus, {
        invoiceGeneratorService,
        logger: fastify.log,
      });
      startOutboxWorker(eventBus);
      if (config.ENABLE_CRON_JOBS) {
        startWeeklyInvoiceCron({ invoiceGeneratorService, logger: fastify.log });
        fastify.log.info("Weekly invoice cron enabled");
      }
      fastify.log.info("Event bus connected, consumers registered, outbox started");
    });
    fastify.addHook("onClose", async () => {
      stopWeeklyInvoiceCron();
      stopOutboxWorker();
      await eventBus.disconnect();
    });
  }

  fastify.get("/health", async () => ({
    status: "ok",
    service: config.SERVICE_NAME,
    version: VERSION,
  }));

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "Request error");
    if (error.validation) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.validation },
      });
    }
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: statusCode < 500 ? error.message : "Internal server error",
      },
    });
  });

  return fastify;
}

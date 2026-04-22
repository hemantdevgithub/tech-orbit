import { z } from "zod";

// Event envelope schema
export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export interface EventBusConfig {
  url: string;
  exchange?: string;
  queue?: string;
}

export interface PublishOptions {
  correlationId?: string;
  timestamp?: Date;
}

export interface SubscribeOptions {
  queue?: string;
  prefetch?: number;
}

export interface EventHandler {
  (envelope: EventEnvelope): Promise<void>;
}

export interface EventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(type: string, payload: Record<string, unknown>, options?: PublishOptions): Promise<void>;
  subscribe(type: string, handler: EventHandler, options?: SubscribeOptions): Promise<void>;
}

function generateEnvelope(
  type: string,
  payload: Record<string, unknown>,
  source: string,
  options?: PublishOptions
): EventEnvelope {
  return {
    id: crypto.randomUUID(),
    type,
    version: "1.0.0",
    timestamp: (options?.timestamp ?? new Date()).toISOString(),
    source,
    correlationId: options?.correlationId ?? crypto.randomUUID(),
    payload,
  };
}

export function createEventBus(
  config: EventBusConfig,
  source: string
): EventBus {
  let connection: Awaited<ReturnType<typeof import("amqplib").connect>> | null = null;
  let channel: Awaited<ReturnType<Awaited<ReturnType<typeof import("amqplib").connect>>["createChannel"]>> | null = null;
  const exchangeName = config.exchange ?? "techorbit.events";
  const subscriptions = new Map<string, EventHandler[]>();

  return {
    async connect() {
      const amqp = await import("amqplib");
      connection = await amqp.connect(config.url);
      channel = await connection.createChannel();

      await channel.assertExchange(exchangeName, "topic", { durable: true });

      connection.on("close", () => {
        connection = null;
        channel = null;
      });

      connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err);
      });
    },

    async disconnect() {
      if (channel) {
        await channel.close();
        channel = null;
      }
      if (connection) {
        await connection.close();
        connection = null;
      }
    },

    async publish(type: string, payload: Record<string, unknown>, options?: PublishOptions) {
      if (!channel) {
        throw new Error("EventBus not connected");
      }

      const envelope = generateEnvelope(type, payload, source, options);
      const routingKey = type;

      channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(envelope)), {
        persistent: true,
        contentType: "application/json",
        messageId: envelope.id,
        timestamp: Date.now(),
        headers: {
          correlationId: envelope.correlationId,
        },
      });
    },

    async subscribe(type: string, handler: EventHandler, options?: SubscribeOptions) {
      if (!channel) {
        throw new Error("EventBus not connected");
      }

      const queueName = options?.queue ?? `${source}.${type}`;
      const routingKey = type;

      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, exchangeName, routingKey);

      if (options?.prefetch) {
        await channel.prefetch(options.prefetch);
      }

      const handlers = subscriptions.get(type) ?? [];
      handlers.push(handler);
      subscriptions.set(type, handlers);

      await channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
          const envelope = EventEnvelopeSchema.parse(JSON.parse(msg.content.toString()));

          for (const h of subscriptions.get(type) ?? []) {
            await h(envelope);
          }

          channel?.ack(msg);
        } catch (err) {
          console.error("Error processing message:", err);
          channel?.nack(msg, false, false);
        }
      });
    },
  };
}
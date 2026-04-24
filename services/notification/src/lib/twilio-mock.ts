import type { FastifyBaseLogger } from "fastify";

export type SmsClient = {
  sendSms(input: { to: string; message: string }): Promise<{ sid: string }>;
};

export function createTwilioMock(logger: FastifyBaseLogger): SmsClient {
  return {
    async sendSms({ to, message }) {
      const sid = `SM-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      logger.info({ to, preview: message.slice(0, 120), sid }, "[mock twilio] sms");
      return { sid };
    },
  };
}

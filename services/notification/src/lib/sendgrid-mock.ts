import type { FastifyBaseLogger } from "fastify";

export type EmailClient = {
  sendEmail(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string }>;
};

// Dev-mode stand-in. Logs structured records instead of calling SendGrid.
// Mailpit (running in docker-compose) captures outgoing SMTP in the same way,
// but we keep this mock so tests can assert on calls without a live SMTP.
export function createSendGridMock(logger: FastifyBaseLogger): EmailClient {
  return {
    async sendEmail({ to, subject, body }) {
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      logger.info({ to, subject, bodyPreview: body.slice(0, 120), messageId }, "[mock sendgrid] email");
      return { messageId };
    },
  };
}

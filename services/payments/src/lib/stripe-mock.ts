import type { Decimal } from "decimal.js";

// Mock Stripe client.  In prod, swap for the real Stripe SDK.  Every
// method is deterministic and logs to stdout so local dev can trace the
// money flow without a Stripe account.

export type StripeInvoice = {
  id: string;
  url: string;
};

export type StripePaymentIntent = {
  id: string;
  clientSecret: string;
};

export type StripeTransfer = {
  id: string;
};

export type StripeClient = {
  createInvoice(opts: {
    customerCompanyId: string;
    invoiceId: string;
    amountUsd: Decimal;
  }): Promise<StripeInvoice>;
  createPaymentIntent(opts: {
    invoiceId: string;
    amountUsd: Decimal;
  }): Promise<StripePaymentIntent>;
  createConnectTransfer(opts: {
    beneficiaryId: string;
    amountUsd: Decimal;
    memo: string;
  }): Promise<StripeTransfer>;
};

export function createStripeMock(logger: { info: (o: unknown, m?: string) => void }): StripeClient {
  return {
    async createInvoice({ invoiceId, amountUsd, customerCompanyId }) {
      logger.info(
        { customerCompanyId, invoiceId, amountUsd: amountUsd.toFixed(2) },
        "[stripe-mock] createInvoice",
      );
      return {
        id: `inv_mock_${invoiceId.slice(0, 12)}`,
        url: `https://invoice.stripe.test/mock/${invoiceId}`,
      };
    },
    async createPaymentIntent({ invoiceId, amountUsd }) {
      logger.info(
        { invoiceId, amountUsd: amountUsd.toFixed(2) },
        "[stripe-mock] createPaymentIntent",
      );
      return {
        id: `pi_mock_${invoiceId.slice(0, 12)}`,
        clientSecret: `pi_mock_${invoiceId.slice(0, 12)}_secret`,
      };
    },
    async createConnectTransfer({ beneficiaryId, amountUsd, memo }) {
      logger.info(
        { beneficiaryId, amountUsd: amountUsd.toFixed(2), memo },
        "[stripe-mock] createConnectTransfer",
      );
      return { id: `tr_mock_${beneficiaryId.slice(0, 8)}_${Date.now()}` };
    },
  };
}

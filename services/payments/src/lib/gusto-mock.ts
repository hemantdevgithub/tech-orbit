import type { Decimal } from "decimal.js";

export type GustoPayroll = {
  payrollId: string;
};

export type GustoClient = {
  processPayroll(opts: {
    candidateUserId: string;
    amountUsd: Decimal;
    memo: string;
  }): Promise<GustoPayroll>;
};

export function createGustoMock(logger: { info: (o: unknown, m?: string) => void }): GustoClient {
  return {
    async processPayroll({ candidateUserId, amountUsd, memo }) {
      logger.info(
        { candidateUserId, amountUsd: amountUsd.toFixed(2), memo },
        "[gusto-mock] processPayroll",
      );
      return { payrollId: `payroll_mock_${candidateUserId.slice(0, 8)}_${Date.now()}` };
    },
  };
}

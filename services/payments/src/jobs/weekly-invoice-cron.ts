import cron from "node-cron";
import type { InvoiceGeneratorService } from "../services/invoice-generator.service.js";

type Deps = {
  invoiceGeneratorService: InvoiceGeneratorService;
  logger: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };
};

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

// Runs every Monday at 00:01 UTC.  Generates weekly invoices for the
// *previous* week (Mon 00:00 → Sun 23:59:59 of week that just ended).
export function startWeeklyInvoiceCron(deps: Deps): void {
  if (scheduledTask !== null) return;

  scheduledTask = cron.schedule(
    "1 0 * * 1",
    async () => {
      const now = new Date();
      // Previous Monday 00:00 UTC
      const thisMonday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      // Shift to Monday
      const day = thisMonday.getUTCDay();
      thisMonday.setUTCDate(thisMonday.getUTCDate() + (day === 0 ? -6 : 1 - day));
      const prevMonday = new Date(thisMonday);
      prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
      const prevSunday = new Date(thisMonday);
      prevSunday.setUTCSeconds(-1);

      deps.logger.info(
        { billingPeriodStart: prevMonday, billingPeriodEnd: prevSunday },
        "Cron triggered — generating weekly invoices",
      );
      try {
        const result = await deps.invoiceGeneratorService.generateWeeklyInvoices(
          prevMonday,
          prevSunday,
        );
        deps.logger.info(result, "Weekly cron complete");
      } catch (err) {
        deps.logger.error({ err: String(err) }, "Weekly cron failed");
      }
    },
    { timezone: "UTC" },
  );
}

export function stopWeeklyInvoiceCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

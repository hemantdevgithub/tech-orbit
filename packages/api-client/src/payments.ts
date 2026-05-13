import type { ApiClient } from "./client.js";
import type {
  CommissionPayoutListResponse,
  CommissionPayoutResponse,
  InvoiceFilter,
  InvoiceListResponse,
  InvoiceResponse,
  PayoutFilter,
  RejectTimesheet,
  SubmitTimesheetRequest,
  TimesheetFilter,
  TimesheetListResponse,
  TimesheetResponse,
  UpdateTimesheet,
} from "@techorbit/types";

export class PaymentsApiClient {
  constructor(private client: ApiClient) {}

  // Timesheets
  submitTimesheet(data: SubmitTimesheetRequest): Promise<TimesheetResponse> {
    return this.client.post("/api/v1/timesheets", data);
  }
  listTimesheets(filters?: TimesheetFilter): Promise<TimesheetListResponse> {
    return this.client.get(`/api/v1/timesheets${qs(filters)}`);
  }
  getTimesheet(id: string): Promise<TimesheetResponse> {
    return this.client.get(`/api/v1/timesheets/${id}`);
  }
  updateTimesheet(id: string, data: UpdateTimesheet): Promise<TimesheetResponse> {
    return this.client.patch(`/api/v1/timesheets/${id}`, data);
  }
  approveTimesheet(id: string): Promise<TimesheetResponse> {
    return this.client.post(`/api/v1/timesheets/${id}/approve`, {});
  }
  rejectTimesheet(id: string, data: RejectTimesheet): Promise<TimesheetResponse> {
    return this.client.post(`/api/v1/timesheets/${id}/reject`, data);
  }

  // Invoices
  listInvoices(filters?: InvoiceFilter): Promise<InvoiceListResponse> {
    return this.client.get(`/api/v1/invoices${qs(filters)}`);
  }
  getInvoice(id: string): Promise<InvoiceResponse> {
    return this.client.get(`/api/v1/invoices/${id}`);
  }
  markInvoicePaid(id: string): Promise<InvoiceResponse> {
    return this.client.post(`/api/v1/invoices/${id}/mark-paid`, {});
  }

  // Payouts
  listPayouts(filters?: PayoutFilter): Promise<CommissionPayoutListResponse> {
    return this.client.get(`/api/v1/payouts${qs(filters)}`);
  }
  getPayout(id: string): Promise<CommissionPayoutResponse> {
    return this.client.get(`/api/v1/payouts/${id}`);
  }
}

export function createPaymentsApiClient(client: ApiClient): PaymentsApiClient {
  return new PaymentsApiClient(client);
}

function qs(filters?: Record<string, unknown>): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

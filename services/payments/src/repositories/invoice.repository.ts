import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceType,
  Prisma,
} from "../generated/client/index.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreateInvoiceData = {
  customerCompanyId: string;
  placementId?: string | null;
  invoiceType: InvoiceType;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subtotalUsd: Prisma.Decimal | number;
  taxUsd?: Prisma.Decimal | number;
  totalUsd: Prisma.Decimal | number;
  dueDate?: Date | null;
};

export type CreateLineItemData = {
  placementId: string;
  timesheetId?: string | null;
  interviewId?: string | null;
  description: string;
  hoursWorked?: Prisma.Decimal | number | null;
  rateUsd?: Prisma.Decimal | number | null;
  amountUsd: Prisma.Decimal | number;
};

export type InvoiceFilterInput = {
  customerCompanyId?: string;
  invoiceType?: InvoiceType;
  status?: InvoiceStatus;
  billingPeriodFrom?: Date;
  billingPeriodTo?: Date;
  // Visibility scope
  scopeCustomerCompanyId?: string;
};

export const invoiceRepository = {
  async createWithLineItems(
    invoice: CreateInvoiceData,
    lineItems: CreateLineItemData[],
    tx: Prisma.TransactionClient,
  ): Promise<Invoice & { lineItems: InvoiceLineItem[] }> {
    const created = await tx.invoice.create({
      data: {
        customerCompanyId: invoice.customerCompanyId,
        placementId: invoice.placementId ?? null,
        invoiceType: invoice.invoiceType,
        billingPeriodStart: invoice.billingPeriodStart,
        billingPeriodEnd: invoice.billingPeriodEnd,
        subtotalUsd: invoice.subtotalUsd as Prisma.Decimal | number,
        taxUsd: (invoice.taxUsd ?? 0) as Prisma.Decimal | number,
        totalUsd: invoice.totalUsd as Prisma.Decimal | number,
        dueDate: invoice.dueDate ?? null,
        status: "DRAFT",
      },
    });

    if (lineItems.length > 0) {
      await tx.invoiceLineItem.createMany({
        data: lineItems.map((li) => ({
          invoiceId: created.id,
          placementId: li.placementId,
          timesheetId: li.timesheetId ?? null,
          interviewId: li.interviewId ?? null,
          description: li.description,
          hoursWorked:
            li.hoursWorked === null || li.hoursWorked === undefined
              ? null
              : (li.hoursWorked as Prisma.Decimal | number),
          rateUsd:
            li.rateUsd === null || li.rateUsd === undefined
              ? null
              : (li.rateUsd as Prisma.Decimal | number),
          amountUsd: li.amountUsd as Prisma.Decimal | number,
        })),
      });
    }

    const withItems = await tx.invoice.findUnique({
      where: { id: created.id },
      include: { lineItems: true },
    });
    return withItems!;
  },

  async findById(
    ctx: AuthContext,
    id: string,
    scopeCustomerCompanyId: string | null,
  ): Promise<Invoice & { lineItems: InvoiceLineItem[] }> {
    const row = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    });
    if (!row) throw new NotFoundError("Invoice not found");

    if (!ctx.roles.includes("ADMIN")) {
      if (scopeCustomerCompanyId !== row.customerCompanyId) {
        throw new ForbiddenError("Cannot access this invoice");
      }
    }
    return row;
  },

  async list(
    ctx: AuthContext,
    filters: InvoiceFilterInput,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Invoice[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Prisma.InvoiceWhereInput = {};
    if (filters.customerCompanyId) where.customerCompanyId = filters.customerCompanyId;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    if (filters.status) where.status = filters.status;
    if (filters.billingPeriodFrom || filters.billingPeriodTo) {
      where.billingPeriodStart = {
        ...(filters.billingPeriodFrom ? { gte: filters.billingPeriodFrom } : {}),
        ...(filters.billingPeriodTo ? { lte: filters.billingPeriodTo } : {}),
      };
    }

    if (!ctx.roles.includes("ADMIN")) {
      if (!filters.scopeCustomerCompanyId) {
        return { data: [], nextCursor: null, hasMore: false };
      }
      where.customerCompanyId = filters.scopeCustomerCompanyId;
    }

    const rows = await prisma.invoice.findMany({
      where,
      orderBy: [{ billingPeriodStart: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return {
      data,
      nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      hasMore,
    };
  },

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    extra: Partial<Pick<Invoice, "sentAt" | "paidAt" | "stripeInvoiceId" | "stripePaymentIntentId">> = {},
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice> {
    const db = tx ?? prisma;
    return db.invoice.update({ where: { id }, data: { status, ...extra } });
  },

  async existsForCustomerPeriod(
    customerCompanyId: string,
    invoiceType: InvoiceType,
    billingPeriodStart: Date,
    placementId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice | null> {
    const db = tx ?? prisma;
    return db.invoice.findFirst({
      where: {
        customerCompanyId,
        invoiceType,
        billingPeriodStart,
        placementId: placementId ?? null,
      },
    });
  },
};

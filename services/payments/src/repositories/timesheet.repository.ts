import type { Decimal } from "@prisma/client/runtime/library.js";
import type {
  Prisma,
  Timesheet,
  TimesheetStatus,
} from "../generated/client/index.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreateTimesheetInput = {
  placementId: string;
  candidateId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  hoursWorked: Decimal | number;
  description?: string | null;
};

export type TimesheetFilterInput = {
  placementId?: string;
  candidateId?: string;
  status?: TimesheetStatus;
  weekStartFrom?: Date;
  weekStartTo?: Date;
  // Scope: the service layer fills this based on the viewer's role so
  // that we never accidentally expose another candidate's timesheet.
  viewerSelfUserId?: string;
  ownedPlacementIds?: string[];
};

// Authz helper — the candidate on the placement, the customer who owns
// it (passed via ownedPlacementIds at the service layer), or admin.
function assertCanRead(ctx: AuthContext, ts: Timesheet, ownedPlacementIds: Set<string>): void {
  if (ctx.roles.includes("ADMIN")) return;
  if (ctx.userId === ts.candidateId) return;
  if (ownedPlacementIds.has(ts.placementId)) return;
  throw new ForbiddenError("Cannot access this timesheet");
}

export const timesheetRepository = {
  async create(input: CreateTimesheetInput): Promise<Timesheet> {
    try {
      return await prisma.timesheet.create({
        data: {
          placementId: input.placementId,
          candidateId: input.candidateId,
          weekStartDate: input.weekStartDate,
          weekEndDate: input.weekEndDate,
          hoursWorked: input.hoursWorked as Prisma.Decimal | number,
          description: input.description ?? null,
          status: "DRAFT",
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new ConflictError("A timesheet for this placement + week already exists");
      }
      throw err;
    }
  },

  async findById(
    ctx: AuthContext,
    id: string,
    ownedPlacementIds: Set<string>,
  ): Promise<Timesheet> {
    const row = await prisma.timesheet.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Timesheet not found");
    assertCanRead(ctx, row, ownedPlacementIds);
    return row;
  },

  async findByIdRaw(id: string): Promise<Timesheet | null> {
    return prisma.timesheet.findUnique({ where: { id } });
  },

  async list(
    ctx: AuthContext,
    filters: TimesheetFilterInput,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Timesheet[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Prisma.TimesheetWhereInput = {};
    if (filters.placementId) where.placementId = filters.placementId;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.status) where.status = filters.status;
    if (filters.weekStartFrom || filters.weekStartTo) {
      where.weekStartDate = {
        ...(filters.weekStartFrom ? { gte: filters.weekStartFrom } : {}),
        ...(filters.weekStartTo ? { lte: filters.weekStartTo } : {}),
      };
    }

    // Authz scope
    const isAdmin = ctx.roles.includes("ADMIN");
    if (!isAdmin) {
      const scope: Prisma.TimesheetWhereInput[] = [];
      if (filters.viewerSelfUserId) scope.push({ candidateId: filters.viewerSelfUserId });
      if (filters.ownedPlacementIds?.length) {
        scope.push({ placementId: { in: filters.ownedPlacementIds } });
      }
      if (scope.length === 0) {
        return { data: [], nextCursor: null, hasMore: false };
      }
      where.OR = scope;
    }

    const rows = await prisma.timesheet.findMany({
      where,
      orderBy: [{ weekStartDate: "desc" }, { id: "desc" }],
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
    status: TimesheetStatus,
    extra: Partial<
      Pick<
        Timesheet,
        | "submittedAt"
        | "approvedAt"
        | "approvedBy"
        | "rejectedAt"
        | "rejectedBy"
        | "rejectionReason"
        | "invoiceId"
      >
    > = {},
    tx?: Prisma.TransactionClient,
  ): Promise<Timesheet> {
    const db = tx ?? prisma;
    const row = await db.timesheet.findUnique({ where: { id } });
    if (!row) throw new NotFoundError("Timesheet not found");
    return db.timesheet.update({ where: { id }, data: { status, ...extra } });
  },

  async findApprovedInWindow(
    placementId: string,
    fromDate: Date,
    toDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Timesheet[]> {
    const db = tx ?? prisma;
    return db.timesheet.findMany({
      where: {
        placementId,
        status: "APPROVED",
        weekStartDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { weekStartDate: "asc" },
    });
  },
};

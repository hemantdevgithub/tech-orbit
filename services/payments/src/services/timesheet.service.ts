import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library";
import { randomUUID } from "node:crypto";
import type {
  RejectTimesheet,
  SubmitTimesheetRequest,
  TimesheetFilter,
  TimesheetListResponse,
  TimesheetResponse,
  UpdateTimesheet,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import type { PlacementApi } from "../lib/placement-api.js";
import { timesheetRepository } from "../repositories/timesheet.repository.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import { toTimesheetResponse } from "../lib/response-mappers.js";

type Deps = { placementApi: PlacementApi };

// Normalise any datetime to the Monday 00:00:00 UTC of that week.
function mondayOf(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

function sundayOf(monday: Date): Date {
  const copy = new Date(monday);
  copy.setUTCDate(copy.getUTCDate() + 6);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

export function createTimesheetService(deps: Deps) {
  const { placementApi } = deps;

  return {
    async submitTimesheet(
      ctx: AuthContext,
      body: SubmitTimesheetRequest,
    ): Promise<TimesheetResponse> {
      // Validate placement + candidate identity via placement-svc.
      const placement = await placementApi.getPlacement(body.placementId);
      if (!placement) throw new NotFoundError("Placement not found");
      if (placement.status !== "ACTIVE") {
        throw new ValidationError(
          `Cannot submit timesheet for placement in status ${placement.status}`,
        );
      }
      if (placement.candidateId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the placement's candidate can submit timesheets");
      }

      const weekStart = mondayOf(new Date(body.weekStartDate));
      const weekEnd = sundayOf(weekStart);
      const now = new Date();
      if (weekStart >= mondayOf(now)) {
        throw new ValidationError("Cannot submit a timesheet for the current or future week");
      }

      const created = await prisma.$transaction(async (tx) => {
        // Insert as SUBMITTED in one step (no DRAFT workflow for v1).
        const row = await timesheetRepository.create({
          placementId: body.placementId,
          candidateId: ctx.userId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          hoursWorked: new PrismaDecimal(body.hoursWorked.toFixed(2)),
          description: body.description ?? null,
        });
        const updated = await timesheetRepository.updateStatus(
          row.id,
          "SUBMITTED",
          { submittedAt: now },
          tx,
        );
        await enqueueEvent(
          tx,
          buildEvent("timesheet.submitted.v1", {
            timesheetId: updated.id,
            placementId: updated.placementId,
            candidateId: updated.candidateId,
            weekStartDate: updated.weekStartDate.toISOString(),
            hoursWorked: Number(updated.hoursWorked),
            submittedAt: now.toISOString(),
          }),
          updated.id,
        );
        return updated;
      });

      return toTimesheetResponse(created);
    },

    async updateTimesheet(
      ctx: AuthContext,
      id: string,
      body: UpdateTimesheet,
    ): Promise<TimesheetResponse> {
      const row = await timesheetRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Timesheet not found");
      if (row.candidateId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the candidate can edit this timesheet");
      }
      if (row.status !== "DRAFT" && row.status !== "REJECTED") {
        throw new ValidationError(`Cannot edit a timesheet in status ${row.status}`);
      }
      const updated = await prisma.timesheet.update({
        where: { id },
        data: {
          hoursWorked: body.hoursWorked !== undefined
            ? new PrismaDecimal(body.hoursWorked.toFixed(2))
            : undefined,
          description: body.description,
          // If editing a rejected sheet, it moves back to SUBMITTED for
          // the customer to re-review.
          status: row.status === "REJECTED" ? "SUBMITTED" : row.status,
          submittedAt: row.status === "REJECTED" ? new Date() : row.submittedAt,
        },
      });
      return toTimesheetResponse(updated);
    },

    async approveTimesheet(
      ctx: AuthContext,
      id: string,
    ): Promise<TimesheetResponse> {
      const row = await timesheetRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Timesheet not found");
      if (row.status !== "SUBMITTED") {
        throw new ValidationError(`Cannot approve a timesheet in status ${row.status}`);
      }

      // Authz: the caller must own the placement (via placement-svc).
      const placement = await placementApi.getPlacement(row.placementId);
      if (!placement) throw new NotFoundError("Placement not found");
      if (placement.createdByUserId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the customer who created the placement can approve timesheets");
      }

      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const u = await timesheetRepository.updateStatus(
          id,
          "APPROVED",
          { approvedAt: now, approvedBy: ctx.userId },
          tx,
        );
        await enqueueEvent(
          tx,
          buildEvent("timesheet.approved.v1", {
            timesheetId: u.id,
            placementId: u.placementId,
            approvedBy: ctx.userId,
            approvedAt: now.toISOString(),
          }),
          u.id,
        );
        return u;
      });
      return toTimesheetResponse(updated);
    },

    async rejectTimesheet(
      ctx: AuthContext,
      id: string,
      body: RejectTimesheet,
    ): Promise<TimesheetResponse> {
      const row = await timesheetRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Timesheet not found");
      if (row.status !== "SUBMITTED") {
        throw new ValidationError(`Cannot reject a timesheet in status ${row.status}`);
      }
      const placement = await placementApi.getPlacement(row.placementId);
      if (!placement) throw new NotFoundError("Placement not found");
      if (placement.createdByUserId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the customer who created the placement can reject timesheets");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await timesheetRepository.updateStatus(
          id,
          "REJECTED",
          { rejectedAt: new Date(), rejectedBy: ctx.userId, rejectionReason: body.reason },
          tx,
        );
        await enqueueEvent(
          tx,
          buildEvent("timesheet.rejected.v1", {
            timesheetId: u.id,
            placementId: u.placementId,
            rejectedBy: ctx.userId,
            reason: body.reason,
            rejectedAt: new Date().toISOString(),
          }),
          u.id,
        );
        return u;
      });
      return toTimesheetResponse(updated);
    },

    async getTimesheet(ctx: AuthContext, id: string): Promise<TimesheetResponse> {
      const row = await timesheetRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Timesheet not found");
      if (
        ctx.userId === row.candidateId ||
        ctx.roles.includes("ADMIN")
      ) {
        return toTimesheetResponse(row);
      }
      // Not the candidate: must be the placement owner.
      const placement = await placementApi.getPlacement(row.placementId);
      if (!placement || placement.createdByUserId !== ctx.userId) {
        throw new ForbiddenError("Cannot access this timesheet");
      }
      return toTimesheetResponse(row);
    },

    async listTimesheets(
      ctx: AuthContext,
      filters: TimesheetFilter,
    ): Promise<TimesheetListResponse> {
      // Resolve the caller's scope.  For a candidate, we show their own.
      // For a customer, we show timesheets on placements they own — derive
      // by fetching active placements where createdByUserId === ctx.userId.
      // Admin sees all.
      const isAdmin = ctx.roles.includes("ADMIN");
      const isCandidate = ctx.roles.includes("CANDIDATE");

      let ownedPlacementIds: string[] | undefined;
      if (!isAdmin) {
        if (ctx.roles.includes("CUSTOMER")) {
          // Walk a few pages of active placements for this customer.
          const collected: string[] = [];
          let cursor: string | undefined;
          for (let page = 0; page < 5; page++) {
            const res = await placementApi.listActivePlacements({ cursor, limit: 100 });
            for (const p of res.data) {
              if (p.createdByUserId === ctx.userId) collected.push(p.id);
            }
            if (!res.hasMore || !res.nextCursor) break;
            cursor = res.nextCursor;
          }
          ownedPlacementIds = collected;
        }
      }

      const { limit, cursor, weekStartFrom, weekStartTo, ...rest } = filters;
      const result = await timesheetRepository.list(
        ctx,
        {
          ...rest,
          weekStartFrom: weekStartFrom ? new Date(weekStartFrom) : undefined,
          weekStartTo: weekStartTo ? new Date(weekStartTo) : undefined,
          viewerSelfUserId: isCandidate ? ctx.userId : undefined,
          ownedPlacementIds,
        },
        cursor ?? null,
        limit,
      );
      return {
        data: result.data.map(toTimesheetResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },
  };
}

export type TimesheetService = ReturnType<typeof createTimesheetService>;

// Exported for use in the invoice generator
export { mondayOf, sundayOf };

// Prevent unused-import lint noise in build output
void randomUUID;

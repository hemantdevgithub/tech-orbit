import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  AddDisputeNote,
  CreateDisputeRequest,
  DisputeFilter,
  DisputeListResponse,
  DisputeNoteResponse,
  DisputeResponse,
  ResolveDispute,
} from "@techorbit/types";
import type { Dispute, DisputeNote } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import {
  addNote,
  countOpen,
  createDispute as repoCreate,
  findDisputeById,
  findDisputeWithNotes,
  listDisputes,
  resolveDispute as repoResolve,
} from "../repositories/dispute.repository.js";
import { createAuditLog } from "../repositories/audit-log.repository.js";

function isAdmin(auth: AuthContext): boolean {
  return auth.roles.includes("ADMIN");
}

function toNote(n: DisputeNote): DisputeNoteResponse {
  return {
    id: n.id,
    disputeId: n.disputeId,
    authorId: n.authorId,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
  };
}

function toResponse(d: Dispute, notes: DisputeNote[] = []): DisputeResponse {
  return {
    id: d.id,
    type: d.type,
    contextType: d.contextType,
    contextId: d.contextId,
    raisedBy: d.raisedBy,
    respondent: d.respondent,
    description: d.description,
    status: d.status,
    resolution: d.resolution,
    resolvedBy: d.resolvedBy,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    notes: notes.map(toNote),
  };
}

function canViewDispute(auth: AuthContext, d: Dispute): boolean {
  return isAdmin(auth) || d.raisedBy === auth.userId || d.respondent === auth.userId;
}

export type DisputeService = ReturnType<typeof createDisputeService>;

export function createDisputeService() {
  return {
    async create(auth: AuthContext, body: CreateDisputeRequest): Promise<DisputeResponse> {
      const row = await prisma.$transaction(async (tx) => {
        const d = await repoCreate(auth.userId, body, tx);
        const event = buildEvent("dispute.raised.v1", {
          disputeId: d.id,
          type: d.type,
          raisedBy: d.raisedBy,
          respondent: d.respondent,
          contextType: d.contextType,
          contextId: d.contextId,
        });
        await enqueueEvent(tx, event, d.id);
        return d;
      });
      return toResponse(row);
    },

    async list(auth: AuthContext, filter: DisputeFilter): Promise<DisputeListResponse> {
      const scope = isAdmin(auth) ? {} : { userId: auth.userId };
      const rows = await listDisputes(filter, scope);
      const hasMore = rows.length > filter.limit;
      const sliced = hasMore ? rows.slice(0, filter.limit) : rows;

      return {
        data: sliced.map((d) => {
          const { notes: _omitted, ...rest } = toResponse(d);
          void _omitted;
          return rest;
        }),
        nextCursor: hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null,
        hasMore,
      };
    },

    async get(auth: AuthContext, id: string): Promise<DisputeResponse> {
      const row = await findDisputeWithNotes(id);
      if (!row) throw new NotFoundError("Dispute not found");
      if (!canViewDispute(auth, row)) throw new ForbiddenError("Not authorized");
      return toResponse(row, row.notes);
    },

    async addNote(
      auth: AuthContext,
      id: string,
      body: AddDisputeNote,
    ): Promise<DisputeNoteResponse> {
      const dispute = await findDisputeById(id);
      if (!dispute) throw new NotFoundError("Dispute not found");
      if (!canViewDispute(auth, dispute)) throw new ForbiddenError("Not authorized");
      if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") {
        throw new ConflictError(`Dispute is ${dispute.status}; cannot add notes`);
      }
      const note = await addNote(id, auth.userId, body.content);
      return toNote(note);
    },

    async resolve(
      auth: AuthContext,
      id: string,
      body: ResolveDispute,
    ): Promise<DisputeResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      const existing = await findDisputeById(id);
      if (!existing) throw new NotFoundError("Dispute not found");
      if (existing.status === "RESOLVED" || existing.status === "CLOSED") {
        throw new ConflictError(`Dispute is already ${existing.status}`);
      }

      const resolved = await prisma.$transaction(async (tx) => {
        const r = await repoResolve(id, auth.userId, body.resolution, tx);
        await createAuditLog(
          {
            action: "DISPUTE_RESOLVED",
            performedBy: auth.userId,
            targetId: id,
            targetType: "DISPUTE",
            metadata: { resolution: body.resolution, type: existing.type },
          },
          tx,
        );
        const event = buildEvent("dispute.resolved.v1", {
          disputeId: id,
          resolution: body.resolution,
          resolvedBy: auth.userId,
        });
        await enqueueEvent(tx, event, id);
        return r;
      });
      return toResponse(resolved);
    },

    async countOpen(): Promise<number> {
      return countOpen();
    },
  };
}

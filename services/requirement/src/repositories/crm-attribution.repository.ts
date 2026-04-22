import type {
  CrmAttributionRequest,
  CrmAttributionStatus,
  Prisma,
} from "../generated/client/index.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CreateCrmAttributionInput = {
  requirementId: string;
  customerCompanyId: string;
  crmUserId: string;
};

function hasAdminRole(ctx: AuthContext): boolean {
  return ctx.roles.includes("ADMIN");
}

export const crmAttributionRepository = {
  async create(
    input: CreateCrmAttributionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CrmAttributionRequest> {
    const db = tx ?? prisma;
    return db.crmAttributionRequest.create({
      data: {
        requirementId: input.requirementId,
        customerCompanyId: input.customerCompanyId,
        crmUserId: input.crmUserId,
        status: "PENDING",
      },
    });
  },

  async findById(
    ctx: AuthContext,
    id: string,
  ): Promise<CrmAttributionRequest> {
    const record = await prisma.crmAttributionRequest.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("Attribution request not found");

    // Readable by the CRM who claimed, any user in the customer company, and admins.
    // Sprint-3 simplification: "user in the customer company" == the requirement's
    // createdByUserId. Secondary company users are post-v1.
    const requirement = await prisma.requirement.findUnique({
      where: { id: record.requirementId },
    });
    if (!requirement) throw new NotFoundError("Requirement not found");

    const isClaimant = record.crmUserId === ctx.userId;
    const isCustomerOwner = requirement.createdByUserId === ctx.userId;
    if (!isClaimant && !isCustomerOwner && !hasAdminRole(ctx)) {
      throw new ForbiddenError("Cannot access this attribution request");
    }
    return record;
  },

  async findPending(
    requirementId: string,
    crmUserId: string,
  ): Promise<CrmAttributionRequest | null> {
    return prisma.crmAttributionRequest.findFirst({
      where: { requirementId, crmUserId, status: "PENDING" },
    });
  },

  async listForCustomer(
    ctx: AuthContext,
    customerCompanyId: string,
    status?: CrmAttributionStatus,
  ): Promise<CrmAttributionRequest[]> {
    // Only the customer (owner) or an admin can see the company's queue.
    // The service layer should have already verified the caller owns this
    // customerCompanyId; we still belt-and-brace here for defense-in-depth.
    if (!hasAdminRole(ctx)) {
      // Confirm at least one requirement in this company was created by ctx.userId
      // (proxy for "user belongs to this company" until multi-user companies exist).
      const owned = await prisma.requirement.findFirst({
        where: { customerCompanyId, createdByUserId: ctx.userId },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenError("Cannot list attribution requests for this company");
      }
    }

    return prisma.crmAttributionRequest.findMany({
      where: {
        customerCompanyId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async approve(
    ctx: AuthContext,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CrmAttributionRequest> {
    const db = tx ?? prisma;
    const record = await db.crmAttributionRequest.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("Attribution request not found");
    if (record.status !== "PENDING") {
      throw new ConflictError("Attribution request is no longer pending");
    }

    // Approver must be the customer who created the requirement (or admin).
    const requirement = await db.requirement.findUnique({
      where: { id: record.requirementId },
    });
    if (!requirement) throw new NotFoundError("Requirement not found");
    if (requirement.createdByUserId !== ctx.userId && !hasAdminRole(ctx)) {
      throw new ForbiddenError("Only the customer can approve this attribution");
    }

    return db.crmAttributionRequest.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedBy: ctx.userId },
    });
  },

  async reject(
    ctx: AuthContext,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CrmAttributionRequest> {
    const db = tx ?? prisma;
    const record = await db.crmAttributionRequest.findUnique({ where: { id } });
    if (!record) throw new NotFoundError("Attribution request not found");
    if (record.status !== "PENDING") {
      throw new ConflictError("Attribution request is no longer pending");
    }

    const requirement = await db.requirement.findUnique({
      where: { id: record.requirementId },
    });
    if (!requirement) throw new NotFoundError("Requirement not found");
    if (requirement.createdByUserId !== ctx.userId && !hasAdminRole(ctx)) {
      throw new ForbiddenError("Only the customer can reject this attribution");
    }

    return db.crmAttributionRequest.update({
      where: { id },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectedBy: ctx.userId },
    });
  },
};

import type {
  LocationType,
  Prisma,
  Requirement,
  Seniority,
  WorkAuthStatus,
} from "../generated/client/index.js";
import type { Decimal } from "@prisma/client/runtime/library.js";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

// ─── Repository input types ──────────────────────────────────────────────────

export type CreateRequirementInput = {
  customerCompanyId: string;
  createdByUserId: string;
  attributedCrmId?: string | null;
  title: string;
  description: string;
  techStack: string[];
  seniority: Seniority;
  locationType: LocationType;
  locationCity?: string | null;
  locationState?: string | null;
  billRateMinUsd: Decimal | number;
  billRateMaxUsd: Decimal | number;
  durationWeeks: number;
  startDate: Date;
  openings?: number;
  workAuthPrefs?: WorkAuthStatus[];
  requiredInterviews?: number;
  blindPosting?: boolean;
};

export type UpdateRequirementInput = Partial<
  Omit<CreateRequirementInput, "customerCompanyId" | "createdByUserId">
>;

export type ListRequirementsFilters = {
  status?: Requirement["status"] | Requirement["status"][];
  techStack?: string | string[];
  seniority?: Seniority | Seniority[];
  locationType?: LocationType | LocationType[];
  workAuthPrefs?: WorkAuthStatus | WorkAuthStatus[];
  customerCompanyId?: string;
  attributedCrmId?: string;
  search?: string;
};

export type ListRequirementsResult = {
  data: Requirement[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ─── Visibility / authz helpers (exported for the service layer) ─────────────

export const requirementAuth = {
  isOwner(ctx: AuthContext, req: Requirement): boolean {
    return ctx.userId === req.createdByUserId;
  },
  isAttributedCrm(ctx: AuthContext, req: Requirement): boolean {
    return req.attributedCrmId !== null && ctx.userId === req.attributedCrmId;
  },
  hasAdminRole(ctx: AuthContext): boolean {
    return ctx.roles.includes("ADMIN");
  },
};

function assertCanReadDraft(ctx: AuthContext, req: Requirement): void {
  const { isOwner, isAttributedCrm, hasAdminRole } = requirementAuth;
  if (!isOwner(ctx, req) && !isAttributedCrm(ctx, req) && !hasAdminRole(ctx)) {
    throw new ForbiddenError("Cannot access this requirement");
  }
}

function assertCanMutate(ctx: AuthContext, req: Requirement): void {
  const { isOwner, hasAdminRole } = requirementAuth;
  if (!isOwner(ctx, req) && !hasAdminRole(ctx)) {
    throw new ForbiddenError("Only the owner can modify this requirement");
  }
}

// Turn a "value-or-array" into a Prisma `in` clause argument.
function asArray<T>(v: T | T[] | undefined): T[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

// ─── Repository ──────────────────────────────────────────────────────────────

export const requirementRepository = {
  async create(
    input: CreateRequirementInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Requirement> {
    const db = tx ?? prisma;
    return db.requirement.create({
      data: {
        customerCompanyId: input.customerCompanyId,
        createdByUserId: input.createdByUserId,
        attributedCrmId: input.attributedCrmId ?? null,
        title: input.title,
        description: input.description,
        techStack: input.techStack,
        seniority: input.seniority,
        locationType: input.locationType,
        locationCity: input.locationCity ?? null,
        locationState: input.locationState ?? null,
        billRateMinUsd: input.billRateMinUsd,
        billRateMaxUsd: input.billRateMaxUsd,
        durationWeeks: input.durationWeeks,
        startDate: input.startDate,
        openings: input.openings ?? 1,
        workAuthPrefs: input.workAuthPrefs ?? [],
        requiredInterviews: input.requiredInterviews ?? 2,
        blindPosting: input.blindPosting ?? false,
      },
    });
  },

  async findById(ctx: AuthContext, id: string): Promise<Requirement> {
    const req = await prisma.requirement.findUnique({ where: { id } });
    if (!req) throw new NotFoundError("Requirement not found");
    if (req.status === "DRAFT") assertCanReadDraft(ctx, req);
    return req;
  },

  async findByIdRaw(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Requirement | null> {
    const db = tx ?? prisma;
    return db.requirement.findUnique({ where: { id } });
  },

  async update(
    ctx: AuthContext,
    id: string,
    data: UpdateRequirementInput,
  ): Promise<Requirement> {
    const req = await prisma.requirement.findUnique({ where: { id } });
    if (!req) throw new NotFoundError("Requirement not found");
    assertCanMutate(ctx, req);
    if (req.status !== "DRAFT") {
      throw new ConflictError("Only draft requirements can be updated");
    }

    // Strip undefined so a PATCH doesn't overwrite untouched fields with null
    const update: Prisma.RequirementUpdateInput = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.techStack !== undefined) update.techStack = data.techStack;
    if (data.seniority !== undefined) update.seniority = data.seniority;
    if (data.locationType !== undefined) update.locationType = data.locationType;
    if (data.locationCity !== undefined) update.locationCity = data.locationCity;
    if (data.locationState !== undefined) update.locationState = data.locationState;
    if (data.billRateMinUsd !== undefined) update.billRateMinUsd = data.billRateMinUsd;
    if (data.billRateMaxUsd !== undefined) update.billRateMaxUsd = data.billRateMaxUsd;
    if (data.durationWeeks !== undefined) update.durationWeeks = data.durationWeeks;
    if (data.startDate !== undefined) update.startDate = data.startDate;
    if (data.openings !== undefined) update.openings = data.openings;
    if (data.workAuthPrefs !== undefined) update.workAuthPrefs = data.workAuthPrefs;
    if (data.requiredInterviews !== undefined) update.requiredInterviews = data.requiredInterviews;
    if (data.blindPosting !== undefined) update.blindPosting = data.blindPosting;
    if (data.attributedCrmId !== undefined) update.attributedCrmId = data.attributedCrmId;

    return prisma.requirement.update({ where: { id }, data: update });
  },

  async publish(
    ctx: AuthContext,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Requirement> {
    const db = tx ?? prisma;
    const req = await db.requirement.findUnique({ where: { id } });
    if (!req) throw new NotFoundError("Requirement not found");
    assertCanMutate(ctx, req);
    if (req.status !== "DRAFT") {
      throw new ConflictError("Only draft requirements can be published");
    }
    return db.requirement.update({
      where: { id },
      data: { status: "OPEN", publishedAt: new Date() },
    });
  },

  async close(
    ctx: AuthContext,
    id: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Requirement> {
    const db = tx ?? prisma;
    const req = await db.requirement.findUnique({ where: { id } });
    if (!req) throw new NotFoundError("Requirement not found");
    assertCanMutate(ctx, req);
    if (req.status === "CLOSED" || req.status === "CANCELLED") {
      throw new ConflictError("Requirement is already closed");
    }
    return db.requirement.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date(), closedReason: reason },
    });
  },

  async setAttributedCrm(
    id: string,
    crmUserId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<Requirement> {
    const db = tx ?? prisma;
    return db.requirement.update({
      where: { id },
      data: { attributedCrmId: crmUserId },
    });
  },

  async list(
    ctx: AuthContext,
    params: {
      filters: ListRequirementsFilters;
      cursor?: string;
      limit: number;
    },
  ): Promise<ListRequirementsResult> {
    const filters: Prisma.RequirementWhereInput = {};

    const statuses = asArray(params.filters.status);
    if (statuses) filters.status = { in: statuses };

    const seniorities = asArray(params.filters.seniority);
    if (seniorities) filters.seniority = { in: seniorities };

    const locationTypes = asArray(params.filters.locationType);
    if (locationTypes) filters.locationType = { in: locationTypes };

    const techStack = asArray(params.filters.techStack);
    if (techStack) filters.techStack = { hasSome: techStack };

    const workAuthPrefs = asArray(params.filters.workAuthPrefs);
    if (workAuthPrefs) filters.workAuthPrefs = { hasSome: workAuthPrefs };

    if (params.filters.customerCompanyId) {
      filters.customerCompanyId = params.filters.customerCompanyId;
    }
    if (params.filters.attributedCrmId) {
      filters.attributedCrmId = params.filters.attributedCrmId;
    }
    if (params.filters.search) {
      filters.OR = [
        { title: { contains: params.filters.search, mode: "insensitive" } },
        { description: { contains: params.filters.search, mode: "insensitive" } },
      ];
    }

    // Visibility: non-admin callers only see published requirements, their own
    // drafts, or ones where they are the attributed CRM.
    const visibility: Prisma.RequirementWhereInput | undefined = requirementAuth.hasAdminRole(ctx)
      ? undefined
      : {
          OR: [
            { status: { not: "DRAFT" } },
            { createdByUserId: ctx.userId },
            { attributedCrmId: ctx.userId },
          ],
        };

    const where: Prisma.RequirementWhereInput = visibility
      ? { AND: [visibility, filters] }
      : filters;

    // Fetch one extra to know if there is a next page without a count query.
    const take = params.limit + 1;
    const rows = await prisma.requirement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
    });

    const hasMore = rows.length > params.limit;
    const data = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;
    return { data, nextCursor, hasMore };
  },
};

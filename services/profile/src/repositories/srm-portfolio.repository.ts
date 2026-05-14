import type {
  Prisma,
  SrmPortfolioMembership,
  PortfolioMemberType,
  PortfolioMembershipStatus,
} from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";

// Sprint 12 — two-sided handshake portfolio between an SRM and a
// candidate/MSME. Either party can initiate by creating a PENDING row; the
// OTHER party approves or rejects.
export const srmPortfolioRepository = {
  async findByPair(
    srmUserId: string,
    memberUserId: string,
    memberType: PortfolioMemberType,
  ): Promise<SrmPortfolioMembership | null> {
    return prisma.srmPortfolioMembership.findUnique({
      where: {
        srmUserId_memberUserId_memberType: { srmUserId, memberUserId, memberType },
      },
    });
  },

  async findById(id: string): Promise<SrmPortfolioMembership | null> {
    return prisma.srmPortfolioMembership.findUnique({ where: { id } });
  },

  async create(input: {
    srmUserId: string;
    memberUserId: string;
    memberType: PortfolioMemberType;
    initiatedBy: "SRM" | "MEMBER";
    initiatedByUserId: string;
  }): Promise<SrmPortfolioMembership> {
    return prisma.srmPortfolioMembership.create({
      data: {
        srmUserId: input.srmUserId,
        memberUserId: input.memberUserId,
        memberType: input.memberType,
        initiatedBy: input.initiatedBy,
        initiatedByUserId: input.initiatedByUserId,
      },
    });
  },

  async approve(
    id: string,
    approverUserId: string,
  ): Promise<SrmPortfolioMembership> {
    return prisma.srmPortfolioMembership.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: approverUserId,
      },
    });
  },

  async reject(
    id: string,
    rejecterUserId: string,
    reason?: string,
  ): Promise<SrmPortfolioMembership> {
    return prisma.srmPortfolioMembership.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedByUserId: rejecterUserId,
        rejectionReason: reason ?? null,
      },
    });
  },

  async listForSrm(
    srmUserId: string,
    filters: { status?: PortfolioMembershipStatus; memberType?: PortfolioMemberType },
  ): Promise<SrmPortfolioMembership[]> {
    const where: Prisma.SrmPortfolioMembershipWhereInput = { srmUserId };
    if (filters.status) where.status = filters.status;
    if (filters.memberType) where.memberType = filters.memberType;
    return prisma.srmPortfolioMembership.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async listForMember(
    memberUserId: string,
    filters: { status?: PortfolioMembershipStatus },
  ): Promise<SrmPortfolioMembership[]> {
    const where: Prisma.SrmPortfolioMembershipWhereInput = { memberUserId };
    if (filters.status) where.status = filters.status;
    return prisma.srmPortfolioMembership.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  async hasApprovedLink(
    srmUserId: string,
    memberUserId: string,
    memberType: PortfolioMemberType,
  ): Promise<boolean> {
    const row = await prisma.srmPortfolioMembership.findUnique({
      where: {
        srmUserId_memberUserId_memberType: { srmUserId, memberUserId, memberType },
      },
    });
    return row !== null && row.status === "APPROVED";
  },
};

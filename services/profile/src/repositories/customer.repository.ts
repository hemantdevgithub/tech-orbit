import type { CustomerCompanyProfile, Prisma } from "../generated/client/index.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type CustomerProfileData = {
  legalName?: string;
  dba?: string | null;
  einEncrypted?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  industry?: string | null;
  companySizeRange?:
    | "SIZE_1_10"
    | "SIZE_11_50"
    | "SIZE_51_200"
    | "SIZE_201_500"
    | "SIZE_501_1000"
    | "SIZE_1001_PLUS"
    | null;
  website?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingZip?: string | null;
  billingCountry?: string | null;
  defaultNetTerms?: number;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED";
};

export const customerRepository = {
  async findByPrimaryUserId(primaryUserId: string): Promise<CustomerCompanyProfile | null> {
    return prisma.customerCompanyProfile.findUnique({ where: { primaryUserId } });
  },

  async getByPrimaryUserId(
    ctx: AuthContext,
    primaryUserId: string,
  ): Promise<CustomerCompanyProfile> {
    const profile = await prisma.customerCompanyProfile.findUnique({ where: { primaryUserId } });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const canRead =
      ctx.userId === primaryUserId ||
      ctx.roles.some((r) => ["ADMIN", "CRM"].includes(r));
    if (!canRead) throw new ForbiddenError("Cannot access this profile");

    return profile;
  },

  async create(
    primaryUserId: string,
    data: CustomerProfileData,
  ): Promise<CustomerCompanyProfile> {
    return prisma.customerCompanyProfile.create({
      data: { primaryUserId, legalName: data.legalName ?? "", ...data },
    });
  },

  async update(
    ctx: AuthContext,
    primaryUserId: string,
    data: CustomerProfileData,
  ): Promise<CustomerCompanyProfile> {
    const profile = await prisma.customerCompanyProfile.findUnique({ where: { primaryUserId } });
    if (!profile) throw new NotFoundError("Customer profile not found");

    const canWrite = ctx.userId === primaryUserId || ctx.roles.includes("ADMIN");
    if (!canWrite) throw new ForbiddenError("Cannot update this profile");

    return prisma.customerCompanyProfile.update({ where: { primaryUserId }, data });
  },

  async createShell(
    primaryUserId: string,
    legalName: string,
  ): Promise<CustomerCompanyProfile> {
    return prisma.customerCompanyProfile.upsert({
      where: { primaryUserId },
      create: { primaryUserId, legalName },
      update: {},
    });
  },

  async attributeCrm(
    ctx: AuthContext,
    primaryUserId: string,
    crmUserId: string,
  ): Promise<CustomerCompanyProfile> {
    if (!ctx.roles.includes("ADMIN") && ctx.userId !== crmUserId) {
      throw new ForbiddenError("Cannot attribute CRM to this customer");
    }

    const profile = await prisma.customerCompanyProfile.findUnique({ where: { primaryUserId } });
    if (!profile) throw new NotFoundError("Customer profile not found");

    return prisma.customerCompanyProfile.update({
      where: { primaryUserId },
      data: { attributedCrmUserId: crmUserId },
    });
  },

  async markComplete(primaryUserId: string): Promise<CustomerCompanyProfile> {
    return prisma.customerCompanyProfile.update({
      where: { primaryUserId },
      data: { isProfileComplete: true },
    });
  },
};

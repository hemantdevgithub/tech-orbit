import type { CustomerCompanyProfile } from "../generated/client/index.js";
import { Prisma } from "../generated/client/index.js";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  CustomerCompanyResponse,
  CreateCustomerCompany,
  UpdateCustomerCompany,
  PublicCustomerProfile,
} from "@techorbit/types";
import { NotFoundError } from "@techorbit/errors";
import { customerRepository } from "../repositories/customer.repository.js";
import type { EncryptionService } from "@techorbit/db-client";

function toResponse(p: CustomerCompanyProfile): CustomerCompanyResponse {
  return {
    id: p.id,
    primaryUserId: p.primaryUserId,
    legalName: p.legalName,
    dba: p.dba,
    hasEin: p.einEncrypted !== null,
    industry: p.industry,
    companySizeRange: p.companySizeRange,
    website: p.website,
    billingStreet: p.billingStreet,
    billingCity: p.billingCity,
    billingState: p.billingState,
    billingZip: p.billingZip,
    billingCountry: p.billingCountry,
    defaultNetTerms: p.defaultNetTerms,
    attributedCrmUserId: p.attributedCrmUserId,
    status: p.status,
    isProfileComplete: p.isProfileComplete,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function isProfileComplete(p: CustomerCompanyProfile): boolean {
  return !!(p.legalName && p.billingCity && p.billingCountry);
}

export function createCustomerService(encryptionService: EncryptionService) {
  return {
    async getProfile(
      ctx: AuthContext,
      primaryUserId: string,
    ): Promise<CustomerCompanyResponse> {
      const profile = await customerRepository.getByPrimaryUserId(ctx, primaryUserId);
      return toResponse(profile);
    },

    async createProfile(
      ctx: AuthContext,
      primaryUserId: string,
      body: CreateCustomerCompany,
    ): Promise<CustomerCompanyResponse> {
      const { ein, ...rest } = body;

      let einEncrypted: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
      if (ein) {
        const encrypted = await encryptionService.encrypt(ein, {
          purpose: "ein",
          userId: primaryUserId,
        });
        einEncrypted = encrypted as unknown as Prisma.InputJsonValue;
      }

      const profile = await customerRepository.create(primaryUserId, { ...rest, einEncrypted });

      if (isProfileComplete(profile) && !profile.isProfileComplete) {
        await customerRepository.markComplete(primaryUserId);
        return toResponse({ ...profile, isProfileComplete: true });
      }
      return toResponse(profile);
    },

    async updateProfile(
      ctx: AuthContext,
      primaryUserId: string,
      body: UpdateCustomerCompany,
    ): Promise<CustomerCompanyResponse> {
      const { ein, ...rest } = body;

      let einEncrypted: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
      if (ein !== undefined) {
        if (ein === null || ein === "") {
          einEncrypted = Prisma.JsonNull;
        } else {
          const encrypted = await encryptionService.encrypt(ein, {
            purpose: "ein",
            userId: primaryUserId,
          });
          einEncrypted = encrypted as unknown as Prisma.InputJsonValue;
        }
      }

      const data = einEncrypted !== undefined ? { ...rest, einEncrypted } : rest;
      const updated = await customerRepository.update(ctx, primaryUserId, data);

      if (isProfileComplete(updated) && !updated.isProfileComplete) {
        await customerRepository.markComplete(primaryUserId);
        return toResponse({ ...updated, isProfileComplete: true });
      }
      return toResponse(updated);
    },

    async attributeCrm(
      ctx: AuthContext,
      primaryUserId: string,
      crmUserId: string,
    ): Promise<CustomerCompanyResponse> {
      const updated = await customerRepository.attributeCrm(ctx, primaryUserId, crmUserId);
      return toResponse(updated);
    },

    async createShell(primaryUserId: string, legalName: string): Promise<void> {
      await customerRepository.createShell(primaryUserId, legalName);
    },

    async getProfileOrNull(primaryUserId: string): Promise<CustomerCompanyResponse | null> {
      const profile = await customerRepository.findByPrimaryUserId(primaryUserId);
      if (!profile) return null;
      return toResponse(profile);
    },

    async getPublicProfile(primaryUserId: string): Promise<PublicCustomerProfile> {
      const profile = await customerRepository.findByPrimaryUserId(primaryUserId);
      if (!profile) throw new NotFoundError("Customer profile not found");
      return {
        id: profile.id,
        primaryUserId: profile.primaryUserId,
        legalName: profile.legalName,
        dba: profile.dba,
        industry: profile.industry,
        companySizeRange: profile.companySizeRange,
        website: profile.website,
      };
    },
  };
}

export type CustomerService = ReturnType<typeof createCustomerService>;

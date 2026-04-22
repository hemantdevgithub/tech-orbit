import { prisma } from "../lib/prisma.js";
import type { AuthContext, SystemContext } from "@techorbit/auth-middleware";
import type { EncryptedField } from "@techorbit/db-client";
import { NotFoundError } from "@techorbit/errors";
import type { User } from "@prisma/client";

// ─── Prisma types ──────────────────────────────────────────────────────────────

type UserWithRoles = User & {
  roles: {
    id: string;
    roleType: string;
    status: string;
    verificationData: unknown;
    createdAt: Date;
    updatedAt: Date;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    rejectNotes: string | null;
  }[];
};

type CreateUserInput = {
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  googleSub?: string | null;
  linkedinSub?: string | null;
  oauthProfile?: string | null;
};

type UpdatePasswordInput = {
  passwordHash: string;
};

// ─── Repository ────────────────────────────────────────────────────────────────

export interface UserRepository {
  findById(ctx: AuthContext | SystemContext, id: string): Promise<UserWithRoles | null>;
  findByEmail(ctx: AuthContext | SystemContext, email: string): Promise<UserWithRoles | null>;
  findByGoogleSub(ctx: AuthContext | SystemContext, googleSub: string): Promise<UserWithRoles | null>;
  findByLinkedinSub(ctx: AuthContext | SystemContext, linkedinSub: string): Promise<UserWithRoles | null>;
  create(ctx: AuthContext | SystemContext, data: CreateUserInput): Promise<UserWithRoles>;
  updatePassword(ctx: AuthContext | SystemContext, id: string, data: UpdatePasswordInput): Promise<UserWithRoles>;
  updateStatus(ctx: AuthContext | SystemContext, id: string, status: "PENDING" | "ACTIVE" | "SUSPENDED"): Promise<UserWithRoles>;
  enableTwoFA(ctx: AuthContext | SystemContext, id: string, secretEncrypted: EncryptedField, backupHash: string): Promise<UserWithRoles>;
  disableTwoFA(ctx: AuthContext | SystemContext, id: string): Promise<UserWithRoles>;
  findByIdOrThrow(ctx: AuthContext | SystemContext, id: string): Promise<UserWithRoles>;
  findByEmailOrThrow(ctx: AuthContext | SystemContext, email: string): Promise<UserWithRoles>;
}

function isSystemContext(ctx: AuthContext | SystemContext): ctx is SystemContext {
  return ctx.type === "system";
}

function checkReadAccess(ctx: AuthContext | SystemContext, user: UserWithRoles): void {
  if (isSystemContext(ctx)) return;
  // Users can only read their own data (admins can read all — add admin check here when needed)
  if (ctx.userId !== user.id) {
    throw new NotFoundError("User not found");
  }
}

function checkWriteAccess(ctx: AuthContext | SystemContext, userId: string): void {
  if (isSystemContext(ctx)) return;
  if (ctx.userId !== userId) {
    throw new NotFoundError("User not found");
  }
}

export const userRepository: UserRepository = {
  async findById(ctx, id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
    if (user && ctx.type !== "system") {
      checkReadAccess(ctx, user);
    }
    return user;
  },

  async findByEmail(ctx, email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: true },
    });
  },

  async findByGoogleSub(ctx, googleSub) {
    return prisma.user.findUnique({
      where: { googleSub },
      include: { roles: true },
    });
  },

  async findByLinkedinSub(ctx, linkedinSub) {
    return prisma.user.findUnique({
      where: { linkedinSub },
      include: { roles: true },
    });
  },

  async create(_ctx, data) {
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        googleSub: data.googleSub,
        linkedinSub: data.linkedinSub,
        oauthProfile: data.oauthProfile,
      },
      include: { roles: true },
    });
    return user;
  },

  async updatePassword(ctx, id, data) {
    checkWriteAccess(ctx, id);
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash: data.passwordHash },
      include: { roles: true },
    });
    return user;
  },

  async updateStatus(ctx, id, status) {
    // Only system context can change status (or admin — add later)
    checkWriteAccess(ctx, id);
    const user = await prisma.user.update({
      where: { id },
      data: { status },
      include: { roles: true },
    });
    return user;
  },

  async enableTwoFA(ctx, id, secretEncrypted, backupHash) {
    checkWriteAccess(ctx, id);
    const user = await prisma.user.update({
      where: { id },
      data: {
        has2FA: true,
        twoFASecretEncrypted: secretEncrypted,
        twoFABackupHash: backupHash,
      },
      include: { roles: true },
    });
    return user;
  },

  async disableTwoFA(ctx, id) {
    checkWriteAccess(ctx, id);
    const user = await prisma.user.update({
      where: { id },
      data: {
        has2FA: false,
        twoFASecretEncrypted: null,
        twoFABackupHash: null,
      },
      include: { roles: true },
    });
    return user;
  },

  async findByIdOrThrow(ctx, id) {
    const user = await this.findById(ctx, id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async findByEmailOrThrow(ctx, email) {
    const user = await this.findByEmail(ctx, email);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },
};

// Export type for convenience
export type { UserWithRoles };

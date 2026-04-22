import type {
  LoginResponse,
  RegisterResponse,
  TokenRefreshResponse,
  MeResponse,
  TwoFASetupResponse,
  PasswordResetRequestResponse,
  UserProfile,
} from "@techorbit/types";
import { ApiClient, ApiError } from "./client.js";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TwoFAVerifyInput {
  code: string;
  challengeToken?: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  password: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface AddRoleInput {
  roleType: string;
}

export class AuthApiClient {
  constructor(private readonly client: ApiClient) {}

  async register(input: RegisterInput): Promise<RegisterResponse> {
    return this.client.post<RegisterResponse>("/api/v1/auth/register", input);
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    return this.client.post<LoginResponse>("/api/v1/auth/login", input);
  }

  async refreshToken(): Promise<TokenRefreshResponse> {
    return this.client.post<TokenRefreshResponse>("/api/v1/auth/refresh");
  }

  async logout(): Promise<void> {
    await this.client.post<void>("/api/v1/auth/logout");
  }

  async getMe(): Promise<MeResponse> {
    return this.client.get<MeResponse>("/api/v1/me");
  }

  async setup2FA(): Promise<TwoFASetupResponse> {
    return this.client.post<TwoFASetupResponse>("/api/v1/auth/2fa/setup");
  }

  async verify2FA(input: TwoFAVerifyInput): Promise<{ accessToken: string; tokenType: string; expiresIn: number }> {
    return this.client.post<{ accessToken: string; tokenType: string; expiresIn: number }>(
      "/api/v1/auth/2fa/verify",
      input
    );
  }

  async disable2FA(input: { code: string; password: string }): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>("/api/v1/auth/2fa/disable", input);
  }

  async requestPasswordReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResponse> {
    return this.client.post<PasswordResetRequestResponse>("/api/v1/auth/password/reset/request", input);
  }

  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>("/api/v1/auth/password/reset/confirm", input);
  }

  async addRole(input: AddRoleInput): Promise<UserProfile> {
    return this.client.post<UserProfile>("/api/v1/me/roles", input);
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────

export function createAuthApiClient(client: ApiClient): AuthApiClient {
  return new AuthApiClient(client);
}

// Re-export for consumers
export { ApiClient, ApiError };
export type { ApiClientConfig } from "./client.js";

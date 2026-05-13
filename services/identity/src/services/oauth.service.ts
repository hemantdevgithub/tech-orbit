import type { SystemContext } from "@techorbit/auth-middleware";
import { userRepository } from "../repositories/index.js";

export interface OAuthProfile {
  provider: "google" | "linkedin";
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

export interface OAuthResult {
  userId: string;
  isNewUser: boolean;
  requiresAdditionalInfo: boolean;
}

// OAuth state stored during the redirect flow
export interface OAuthState {
  returnTo?: string;
  role?: string;
}

const googleOAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const linkedinOAuthUrl = "https://www.linkedin.com/oauth/v2/authorization";

// ─── Google OAuth ───────────────────────────────────────────────────────────────

export function getGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state,
  });
  return `${googleOAuthUrl}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  ctx: SystemContext,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<OAuthProfile | null> {
  // Exchange authorization code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) return null;
  const tokens = await tokenResponse.json() as { access_token: string };

  // Get user info
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) return null;
  const info = await userResponse.json() as {
    id: string;
    email: string;
    given_name: string;
    family_name: string;
    picture?: string;
  };

  return {
    provider: "google",
    sub: info.id,
    email: info.email.toLowerCase(),
    firstName: info.given_name,
    lastName: info.family_name ?? "",
    picture: info.picture,
  };
}

export async function findOrLinkGoogleUser(
  ctx: SystemContext,
  profile: OAuthProfile
): Promise<OAuthResult> {
  // Try to find by Google sub
  const existingBySub = await userRepository.findByGoogleSub(ctx, profile.sub);
  if (existingBySub) {
    return { userId: existingBySub.id, isNewUser: false, requiresAdditionalInfo: false };
  }

  // Try to find by email
  const existingByEmail = await userRepository.findByEmail(ctx, profile.email);
  if (existingByEmail) {
    // Link Google to existing account
    // We need to update the user to add googleSub
    // For now, require the user to log in with Google if they have a password account
    // A more sophisticated approach would allow linking
    return { userId: existingByEmail.id, isNewUser: false, requiresAdditionalInfo: true };
  }

  // Create new user
  const user = await userRepository.create(ctx, {
    email: profile.email,
    passwordHash: null,
    firstName: profile.firstName,
    lastName: profile.lastName,
    googleSub: profile.sub,
    oauthProfile: JSON.stringify({
      picture: profile.picture,
      provider: "google",
    }),
  });

  return { userId: user.id, isNewUser: true, requiresAdditionalInfo: false };
}

// ─── LinkedIn OAuth ─────────────────────────────────────────────────────────────

export function getLinkedInAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `${linkedinOAuthUrl}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<OAuthProfile | null> {
  // Exchange code for tokens
  const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) return null;
  const tokens = await tokenResponse.json() as { access_token: string };

  // Get user info using OpenID Connect
  const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userResponse.ok) return null;
  const info = await userResponse.json() as {
    sub: string;
    email: string;
    given_name: string;
    family_name: string;
    picture?: string;
  };

  return {
    provider: "linkedin",
    sub: info.sub,
    email: info.email.toLowerCase(),
    firstName: info.given_name,
    lastName: info.family_name ?? "",
    picture: info.picture,
  };
}

export async function findOrLinkLinkedInUser(
  ctx: SystemContext,
  profile: OAuthProfile
): Promise<OAuthResult> {
  const existingBySub = await userRepository.findByLinkedinSub(ctx, profile.sub);
  if (existingBySub) {
    return { userId: existingBySub.id, isNewUser: false, requiresAdditionalInfo: false };
  }

  const existingByEmail = await userRepository.findByEmail(ctx, profile.email);
  if (existingByEmail) {
    return { userId: existingByEmail.id, isNewUser: false, requiresAdditionalInfo: true };
  }

  const user = await userRepository.create(ctx, {
    email: profile.email,
    passwordHash: null,
    firstName: profile.firstName,
    lastName: profile.lastName,
    linkedinSub: profile.sub,
    oauthProfile: JSON.stringify({
      picture: profile.picture,
      provider: "linkedin",
    }),
  });

  return { userId: user.id, isNewUser: true, requiresAdditionalInfo: false };
}
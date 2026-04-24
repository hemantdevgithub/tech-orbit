import {
  ApiClient,
  createAdminApiClient,
  createAuthApiClient,
  createInterviewApiClient,
  createMatchingApiClient,
  createMessagingApiClient,
  createNotificationApiClient,
  createPaymentsApiClient,
  createPlacementApiClient,
  createProfileApiClient,
  createRatingApiClient,
  createRequirementApiClient,
} from "@techorbit/api-client";
import type {
  AdminApiClient,
  AuthApiClient,
  InterviewApiClient,
  MatchingApiClient,
  MessagingApiClient,
  NotificationApiClient,
  PaymentsApiClient,
  PlacementApiClient,
  ProfileApiClient,
  RatingApiClient,
  RequirementApiClient,
} from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";

const IDENTITY_BASE_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL ?? "http://localhost:4001";
const PROFILE_BASE_URL =
  process.env.NEXT_PUBLIC_PROFILE_URL ?? "http://localhost:3004";
const FILE_BASE_URL =
  process.env.NEXT_PUBLIC_FILE_URL ?? "http://localhost:3003";
const REQUIREMENT_BASE_URL =
  process.env.NEXT_PUBLIC_REQUIREMENT_URL ?? "http://localhost:3005";
const MATCHING_BASE_URL =
  process.env.NEXT_PUBLIC_MATCHING_URL ?? "http://localhost:3006";
const INTERVIEW_BASE_URL =
  process.env.NEXT_PUBLIC_INTERVIEW_URL ?? "http://localhost:3007";
const PLACEMENT_BASE_URL =
  process.env.NEXT_PUBLIC_PLACEMENT_URL ?? "http://localhost:3008";
const PAYMENTS_BASE_URL =
  process.env.NEXT_PUBLIC_PAYMENTS_URL ?? "http://localhost:3009";
const MESSAGING_BASE_URL =
  process.env.NEXT_PUBLIC_MESSAGING_URL ?? "http://localhost:3010";
const NOTIFICATION_BASE_URL =
  process.env.NEXT_PUBLIC_NOTIFICATION_URL ?? "http://localhost:3011";
const RATING_BASE_URL =
  process.env.NEXT_PUBLIC_RATING_URL ?? "http://localhost:3012";
const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3014";

let apiClientInstance: ApiClient | null = null;
let authClientInstance: AuthApiClient | null = null;
let profileClientInstance: ProfileApiClient | null = null;
let profileApiClientInstance: ApiClient | null = null;
let fileApiClientInstance: ApiClient | null = null;
let requirementApiClientInstance: ApiClient | null = null;
let requirementClientInstance: RequirementApiClient | null = null;
let matchingApiClientInstance: ApiClient | null = null;
let matchingClientInstance: MatchingApiClient | null = null;
let interviewApiClientInstance: ApiClient | null = null;
let interviewClientInstance: InterviewApiClient | null = null;
let placementApiClientInstance: ApiClient | null = null;
let placementClientInstance: PlacementApiClient | null = null;
let paymentsApiClientInstance: ApiClient | null = null;
let paymentsClientInstance: PaymentsApiClient | null = null;
let messagingApiClientInstance: ApiClient | null = null;
let messagingClientInstance: MessagingApiClient | null = null;
let notificationApiClientInstance: ApiClient | null = null;
let notificationClientInstance: NotificationApiClient | null = null;
let ratingApiClientInstance: ApiClient | null = null;
let ratingClientInstance: RatingApiClient | null = null;
let adminApiClientInstance: ApiClient | null = null;
let adminClientInstance: AdminApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    const store = useAuthStore.getState();

    apiClientInstance = new ApiClient({
      baseUrl: IDENTITY_BASE_URL,
      getAccessToken: () => store.accessToken,
      onAccessTokenRefresh: (token) => {
        useAuthStore.getState().setTokens(token, 900); // 15 min default
      },
      onRefreshFailure: () => {
        useAuthStore.getState().logout();
        // Redirect to login on refresh failure
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },
    });
  }
  return apiClientInstance;
}

export function getAuthClient(): AuthApiClient {
  if (!authClientInstance) {
    authClientInstance = createAuthApiClient(getApiClient());
  }
  return authClientInstance;
}

function makeServiceClient(baseUrl: string): ApiClient {
  const store = useAuthStore.getState();
  return new ApiClient({
    baseUrl,
    getAccessToken: () => store.accessToken,
    onAccessTokenRefresh: (token) => {
      useAuthStore.getState().setTokens(token, 900);
    },
    onRefreshFailure: () => {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    },
  });
}

export function getProfileApiClient(): ApiClient {
  if (!profileApiClientInstance) {
    profileApiClientInstance = makeServiceClient(PROFILE_BASE_URL);
  }
  return profileApiClientInstance;
}

export function getFileApiClient(): ApiClient {
  if (!fileApiClientInstance) {
    fileApiClientInstance = makeServiceClient(FILE_BASE_URL);
  }
  return fileApiClientInstance;
}

export function getProfileClient(): ProfileApiClient {
  if (!profileClientInstance) {
    // Profile client routes to both profile-svc and file-svc
    // For simplicity, file endpoints use profile-svc's ApiClient with FILE_BASE_URL
    profileClientInstance = createProfileApiClient(getProfileApiClient());
  }
  return profileClientInstance;
}

export function getRequirementApiClient(): ApiClient {
  if (!requirementApiClientInstance) {
    requirementApiClientInstance = makeServiceClient(REQUIREMENT_BASE_URL);
  }
  return requirementApiClientInstance;
}

export function getRequirementClient(): RequirementApiClient {
  if (!requirementClientInstance) {
    requirementClientInstance = createRequirementApiClient(
      getRequirementApiClient(),
    );
  }
  return requirementClientInstance;
}

export function getMatchingApiClient(): ApiClient {
  if (!matchingApiClientInstance) {
    matchingApiClientInstance = makeServiceClient(MATCHING_BASE_URL);
  }
  return matchingApiClientInstance;
}

export function getMatchingClient(): MatchingApiClient {
  if (!matchingClientInstance) {
    matchingClientInstance = createMatchingApiClient(getMatchingApiClient());
  }
  return matchingClientInstance;
}

export function getInterviewApiClient(): ApiClient {
  if (!interviewApiClientInstance) {
    interviewApiClientInstance = makeServiceClient(INTERVIEW_BASE_URL);
  }
  return interviewApiClientInstance;
}

export function getInterviewClient(): InterviewApiClient {
  if (!interviewClientInstance) {
    interviewClientInstance = createInterviewApiClient(getInterviewApiClient());
  }
  return interviewClientInstance;
}

export function getPlacementApiClient(): ApiClient {
  if (!placementApiClientInstance) {
    placementApiClientInstance = makeServiceClient(PLACEMENT_BASE_URL);
  }
  return placementApiClientInstance;
}

export function getPlacementClient(): PlacementApiClient {
  if (!placementClientInstance) {
    placementClientInstance = createPlacementApiClient(getPlacementApiClient());
  }
  return placementClientInstance;
}

export function getPaymentsApiClient(): ApiClient {
  if (!paymentsApiClientInstance) {
    paymentsApiClientInstance = makeServiceClient(PAYMENTS_BASE_URL);
  }
  return paymentsApiClientInstance;
}

export function getPaymentsClient(): PaymentsApiClient {
  if (!paymentsClientInstance) {
    paymentsClientInstance = createPaymentsApiClient(getPaymentsApiClient());
  }
  return paymentsClientInstance;
}

export function getMessagingApiClient(): ApiClient {
  if (!messagingApiClientInstance) {
    messagingApiClientInstance = makeServiceClient(MESSAGING_BASE_URL);
  }
  return messagingApiClientInstance;
}

export function getMessagingClient(): MessagingApiClient {
  if (!messagingClientInstance) {
    messagingClientInstance = createMessagingApiClient(getMessagingApiClient());
  }
  return messagingClientInstance;
}

export function getNotificationApiClient(): ApiClient {
  if (!notificationApiClientInstance) {
    notificationApiClientInstance = makeServiceClient(NOTIFICATION_BASE_URL);
  }
  return notificationApiClientInstance;
}

export function getNotificationClient(): NotificationApiClient {
  if (!notificationClientInstance) {
    notificationClientInstance = createNotificationApiClient(getNotificationApiClient());
  }
  return notificationClientInstance;
}

export function getRatingApiClient(): ApiClient {
  if (!ratingApiClientInstance) {
    ratingApiClientInstance = makeServiceClient(RATING_BASE_URL);
  }
  return ratingApiClientInstance;
}

export function getRatingClient(): RatingApiClient {
  if (!ratingClientInstance) {
    ratingClientInstance = createRatingApiClient(getRatingApiClient());
  }
  return ratingClientInstance;
}

export function getAdminApiClient(): ApiClient {
  if (!adminApiClientInstance) {
    adminApiClientInstance = makeServiceClient(ADMIN_BASE_URL);
  }
  return adminApiClientInstance;
}

export function getAdminClient(): AdminApiClient {
  if (!adminClientInstance) {
    adminClientInstance = createAdminApiClient(getAdminApiClient());
  }
  return adminClientInstance;
}

// Singleton reset for server-side / HMR
export function resetApiClient(): void {
  apiClientInstance = null;
  authClientInstance = null;
  profileClientInstance = null;
  profileApiClientInstance = null;
  fileApiClientInstance = null;
  requirementApiClientInstance = null;
  requirementClientInstance = null;
  matchingApiClientInstance = null;
  matchingClientInstance = null;
  interviewApiClientInstance = null;
  interviewClientInstance = null;
  placementApiClientInstance = null;
  placementClientInstance = null;
  paymentsApiClientInstance = null;
  paymentsClientInstance = null;
  messagingApiClientInstance = null;
  messagingClientInstance = null;
  notificationApiClientInstance = null;
  notificationClientInstance = null;
  ratingApiClientInstance = null;
  ratingClientInstance = null;
  adminApiClientInstance = null;
  adminClientInstance = null;
}

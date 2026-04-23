import type { ApiClient } from "./client.js";
import type {
  CandidateProfileResponse,
  UpdateCandidateProfile,
  StartKycResponse,
  MsmeProfileResponse,
  CreateMsmeProfile,
  UpdateMsmeProfile,
  BenchEntryResponse,
  AddBenchEntry,
  CustomerCompanyResponse,
  CreateCustomerCompany,
  UpdateCustomerCompany,
  InterviewerProfileResponse,
  CreateInterviewerProfile,
  UpdateInterviewerProfile,
  SetAvailability,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  FileResponse,
} from "@techorbit/types";

export class ProfileApiClient {
  constructor(private client: ApiClient) {}

  // ─── Candidate ───────────────────────────────────────────────────────────────

  getCandidateProfile(): Promise<CandidateProfileResponse> {
    return this.client.get("/api/v1/candidates/me");
  }

  updateCandidateProfile(data: UpdateCandidateProfile): Promise<CandidateProfileResponse> {
    return this.client.patch("/api/v1/candidates/me", data);
  }

  attachResume(fileId: string): Promise<CandidateProfileResponse> {
    return this.client.post("/api/v1/candidates/me/resume", { fileId });
  }

  startKyc(): Promise<StartKycResponse> {
    return this.client.post("/api/v1/candidates/me/kyc/start");
  }

  getCandidateByUserId(userId: string): Promise<CandidateProfileResponse> {
    return this.client.get(`/api/v1/candidates/${userId}`);
  }

  // ─── MSME ────────────────────────────────────────────────────────────────────

  getMsmeProfile(): Promise<MsmeProfileResponse> {
    return this.client.get("/api/v1/msme/me");
  }

  createMsmeProfile(data: CreateMsmeProfile): Promise<MsmeProfileResponse> {
    return this.client.post("/api/v1/msme/me", data);
  }

  updateMsmeProfile(data: UpdateMsmeProfile): Promise<MsmeProfileResponse> {
    return this.client.patch("/api/v1/msme/me", data);
  }

  getBenchEntries(): Promise<{ data: BenchEntryResponse[] }> {
    return this.client.get("/api/v1/msme/me/bench");
  }

  addBenchEntry(data: AddBenchEntry): Promise<BenchEntryResponse> {
    return this.client.post("/api/v1/msme/me/bench", data);
  }

  removeBenchEntry(entryId: string): Promise<void> {
    return this.client.delete(`/api/v1/msme/me/bench/${entryId}`);
  }

  // ─── Customer ─────────────────────────────────────────────────────────────────

  getCustomerProfile(): Promise<CustomerCompanyResponse> {
    return this.client.get("/api/v1/customers/me");
  }

  createCustomerProfile(data: CreateCustomerCompany): Promise<CustomerCompanyResponse> {
    return this.client.post("/api/v1/customers/me", data);
  }

  updateCustomerProfile(data: UpdateCustomerCompany): Promise<CustomerCompanyResponse> {
    return this.client.patch("/api/v1/customers/me", data);
  }

  // ─── Interviewer ──────────────────────────────────────────────────────────────

  getInterviewerProfile(): Promise<InterviewerProfileResponse> {
    return this.client.get("/api/v1/interviewers/me");
  }

  createInterviewerProfile(data: CreateInterviewerProfile): Promise<InterviewerProfileResponse> {
    return this.client.post("/api/v1/interviewers/me", data);
  }

  updateInterviewerProfile(data: UpdateInterviewerProfile): Promise<InterviewerProfileResponse> {
    return this.client.patch("/api/v1/interviewers/me", data);
  }

  setAvailability(data: SetAvailability): Promise<InterviewerProfileResponse> {
    return this.client.put("/api/v1/interviewers/me/availability", data);
  }

  listInterviewers(opts?: {
    specializations?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<{ data: InterviewerProfileResponse[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (opts?.specializations?.length) params.set("specializations", opts.specializations.join(","));
    if (opts?.cursor) params.set("cursor", opts.cursor);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params.toString()}` : "";
    return this.client.get(`/api/v1/interviewers${q}`);
  }

  getInterviewerByUserId(userId: string): Promise<InterviewerProfileResponse> {
    return this.client.get(`/api/v1/interviewers/${userId}`);
  }

  // ─── Files ───────────────────────────────────────────────────────────────────

  requestUploadUrl(data: FileUploadUrlRequest): Promise<FileUploadUrlResponse> {
    return this.client.post("/api/v1/files/upload-url", data);
  }

  confirmUpload(fileId: string): Promise<FileResponse> {
    return this.client.post(`/api/v1/files/${fileId}/confirm`);
  }

  getFile(fileId: string): Promise<FileResponse> {
    return this.client.get(`/api/v1/files/${fileId}`);
  }

  getDownloadUrl(fileId: string): Promise<{ downloadUrl: string }> {
    return this.client.get(`/api/v1/files/${fileId}/download-url`);
  }
}

export function createProfileApiClient(
  client: ApiClient,
): ProfileApiClient {
  return new ProfileApiClient(client);
}

// Daily.co REST API wrapper.
// When DAILY_API_KEY is not set, all methods return mock URLs so the
// service is fully testable without a Daily account.

export type DailyRoom = {
  name: string;
  url: string;
  privacyMode: "private" | "public";
};

export type DailyRecording = {
  providerId: string;
  downloadUrl: string;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
};

export type DailyApi = {
  createRoom(name: string, startTime: Date, endTime: Date): Promise<DailyRoom>;
  getRoomUrl(name: string): Promise<string | null>;
  deleteRoom(name: string): Promise<void>;
  getRecordingUrl(roomName: string): Promise<string | null>;
  getRecording(roomName: string): Promise<DailyRecording | null>;
};

const DAILY_BASE = "https://api.daily.co/v1";

function makeMockUrl(name: string): string {
  return `https://mock.daily.co/${name}`;
}

// Deterministic sample used by the mock so two calls for the same room yield
// the same recording. The URL points at a publicly hosted sample clip so the
// browser player has something real to render during demos.
const MOCK_SAMPLE_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const MOCK_SAMPLE_MIME = "video/mp4";
const MOCK_SAMPLE_SIZE = 2_500_000;
const MOCK_SAMPLE_DURATION = 15;

function createMockApi(): DailyApi {
  return {
    async createRoom(name) {
      return { name, url: makeMockUrl(name), privacyMode: "private" };
    },
    async getRoomUrl(name) {
      return makeMockUrl(name);
    },
    async deleteRoom() {
      // no-op in mock
    },
    async getRecordingUrl(roomName) {
      return `${MOCK_SAMPLE_URL}?room=${encodeURIComponent(roomName)}`;
    },
    async getRecording(roomName) {
      return {
        providerId: `mock-rec-${roomName}`,
        downloadUrl: MOCK_SAMPLE_URL,
        durationSec: MOCK_SAMPLE_DURATION,
        sizeBytes: MOCK_SAMPLE_SIZE,
        mimeType: MOCK_SAMPLE_MIME,
      };
    },
  };
}

function createLiveApi(apiKey: string, domain: string): DailyApi {
  async function apiFetch(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const res = await fetch(`${DAILY_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Daily.co API ${method} ${path} → ${res.status}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    async createRoom(name, startTime, endTime) {
      const data = (await apiFetch("POST", "/rooms", {
        name,
        privacy: "private",
        properties: {
          exp: Math.floor(endTime.getTime() / 1000) + 60 * 15, // 15 min grace
          nbf: Math.floor(startTime.getTime() / 1000) - 60 * 5, // 5 min early
          enable_recording: "cloud",
        },
      })) as { name: string; url: string };
      return { name: data.name, url: `https://${domain}/${data.name}`, privacyMode: "private" };
    },

    async getRoomUrl(name) {
      try {
        const data = (await apiFetch("GET", `/rooms/${name}`)) as { url?: string };
        return data.url ?? `https://${domain}/${name}`;
      } catch {
        return null;
      }
    },

    async deleteRoom(name) {
      await apiFetch("DELETE", `/rooms/${name}`).catch(() => {
        // Best-effort; room may already be gone.
      });
    },

    async getRecordingUrl(roomName) {
      const rec = await this.getRecording(roomName);
      return rec?.downloadUrl ?? null;
    },

    async getRecording(roomName) {
      try {
        const data = (await apiFetch(
          "GET",
          `/recordings?room_name=${roomName}&limit=1`,
        )) as {
          data?: Array<{
            id?: string;
            download_url?: string;
            duration?: number;
            mtgSessionId?: string;
            file_size?: number;
            file_format?: string;
            status?: string;
          }>;
        };
        const rec = data.data?.[0];
        if (!rec?.download_url || rec.status !== "finished") {
          return null;
        }
        return {
          providerId: rec.id ?? `daily-${roomName}`,
          downloadUrl: rec.download_url,
          durationSec: rec.duration ?? 0,
          sizeBytes: rec.file_size ?? 0,
          mimeType:
            rec.file_format === "webm" ? "video/webm" : "video/mp4",
        };
      } catch {
        return null;
      }
    },
  };
}

export function createDailyApi(apiKey?: string, domain?: string): DailyApi {
  if (!apiKey) {
    return createMockApi();
  }
  return createLiveApi(apiKey, domain ?? "techorbit.daily.co");
}

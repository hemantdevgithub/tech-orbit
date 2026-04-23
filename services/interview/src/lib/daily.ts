// Daily.co REST API wrapper.
// When DAILY_API_KEY is not set, all methods return mock URLs so the
// service is fully testable without a Daily account.

export type DailyRoom = {
  name: string;
  url: string;
  privacyMode: "private" | "public";
};

export type DailyApi = {
  createRoom(name: string, startTime: Date, endTime: Date): Promise<DailyRoom>;
  getRoomUrl(name: string): Promise<string | null>;
  deleteRoom(name: string): Promise<void>;
  getRecordingUrl(roomName: string): Promise<string | null>;
};

const DAILY_BASE = "https://api.daily.co/v1";

function makeMockUrl(name: string): string {
  return `https://mock.daily.co/${name}`;
}

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
    async getRecordingUrl() {
      return null;
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
      try {
        const data = (await apiFetch("GET", `/recordings?room_name=${roomName}&limit=1`)) as {
          data?: Array<{ s3_key?: string; download_url?: string }>;
        };
        return data.data?.[0]?.download_url ?? null;
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

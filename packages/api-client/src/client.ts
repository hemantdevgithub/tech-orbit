// ─── Core API client ───────────────────────────────────────────────────────────

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken: () => string | null;
  onAccessTokenRefresh: (token: string) => void;
  onRefreshFailure: () => void;
}

type FetchOptions = RequestInit & {
  timeout?: number;
};

class ApiClient {
  private config: ApiClientConfig;
  private refreshingPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { timeout = 10_000, ...fetchOptions } = options;

    const accessToken = this.config.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle token refresh on 401
      if (response.status === 401 && accessToken) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          // Retry once with new token
          headers["Authorization"] = `Bearer ${refreshed}`;
          const retryResponse = await fetch(`${this.config.baseUrl}${path}`, {
            ...fetchOptions,
            headers,
          });

          return this.parseResponse<T>(retryResponse);
        } else {
          this.config.onRefreshFailure();
        }
      }

      return this.parseResponse<T>(response);
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  private async tryRefresh(): Promise<string | null> {
    if (this.refreshingPromise) {
      return this.refreshingPromise;
    }

    this.refreshingPromise = this.refreshTokens();
    try {
      const token = await this.refreshingPromise;
      if (token) {
        this.config.onAccessTokenRefresh(token);
      }
      return token;
    } finally {
      this.refreshingPromise = null;
    }
  }

  private async refreshTokens(): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    } catch {
      return null;
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      let errorBody: { error?: { code?: string; message?: string } } = {};
      if (contentType.includes("application/json")) {
        errorBody = (await response.json().catch(() => ({}))) as typeof errorBody;
      }

      const code = errorBody?.error?.code ?? "HTTP_ERROR";
      const message = errorBody?.error?.message ?? response.statusText;

      throw new ApiError(response.status, code, message);
    }

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  // ─── Public HTTP methods ────────────────────────────────────────────────────

  async get<T>(path: string, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "POST", body: JSON.stringify(body) });
  }

  async put<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "PUT", body: JSON.stringify(body) });
  }

  async patch<T>(path: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
  }

  async delete<T>(path: string, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "DELETE" });
  }
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.code === "VALIDATION_ERROR";
  }
}

export { ApiClient };

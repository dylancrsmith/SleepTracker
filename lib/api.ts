/**
 * API client for the SleepTracker backend.
 * All requests go through here so we have one place to manage the base URL and auth token.
 */

const BASE_URL = "https://sleeptracker-rq4y.onrender.com";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: object;
  token?: string | null;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    // Throw the server's error message so we can show it in the UI
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  age: number;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export type RegisterParams = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  age: number;
  weight?: number;
  gender?: string;
  activityLevel?: string;
};

export const authApi = {
  register: (params: RegisterParams) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: params,
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  me: (token: string) =>
    request<{ user: AuthUser }>("/api/auth/me", { token }),
};

// ─── Sleep Logs ───────────────────────────────────────────────────────────────

export const sleepApi = {
  getLogs: (token: string) =>
    request<{ logs: any[] }>("/api/sleep", { token }),

  saveLog: (log: object, token: string) =>
    request<{ log: any }>("/api/sleep", {
      method: "POST",
      body: log,
      token,
    }),

  deleteLog: (id: string, token: string) =>
    request<{ message: string }>(`/api/sleep/${id}`, {
      method: "DELETE",
      token,
    }),
};

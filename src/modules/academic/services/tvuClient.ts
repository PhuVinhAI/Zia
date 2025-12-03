/**
 * TVU API Client - HTTP client cho TVU Student Portal API
 */

import { debugLog, logError } from "../../../core/logger/logger.js";

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const TVU_BASE_URL = "https://ttsv.tvu.edu.vn";
const TVU_TIMEOUT = 10000;

const TVU_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://ttsv.tvu.edu.vn",
};

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface TvuResponse<T> {
  result: boolean;
  code: number;
  message: string;
  data: T;
}

export interface TvuLoginResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  user_id: string;
  user_name: string;
}

// Token storage (in-memory, có thể mở rộng sang file/db)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// ═══════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════

export function setTvuToken(token: string, expiresIn: number = 3600): void {
  cachedToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
  debugLog("TVU", `Token set, expires in ${expiresIn}s`);
}

export function getTvuToken(): string | null {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  return null;
}

export function clearTvuToken(): void {
  cachedToken = null;
  tokenExpiry = 0;
}

// ═══════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════

/**
 * Login TVU và lấy access token
 */
export async function tvuLogin(
  username: string,
  password: string
): Promise<TvuLoginResponse> {
  debugLog("TVU", `Logging in as ${username}`);

  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);
  params.append("grant_type", "password");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TVU_TIMEOUT);

  try {
    const response = await fetch(`${TVU_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        ...TVU_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Login failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Lưu token
    if (data.access_token) {
      setTvuToken(data.access_token, data.expires_in || 3600);
    }

    debugLog("TVU", `Login success for ${username}`);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    logError("tvuLogin", error);
    throw error;
  }
}

/**
 * Gọi TVU API với authentication
 */
export async function tvuRequest<T>(
  endpoint: string,
  body: any = {},
  extraHeaders: Record<string, string> = {}
): Promise<TvuResponse<T>> {
  const token = getTvuToken();
  if (!token) {
    throw new Error("Chưa đăng nhập TVU. Vui lòng đăng nhập trước.");
  }

  debugLog("TVU", `Request: ${endpoint}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TVU_TIMEOUT);

  try {
    const response = await fetch(`${TVU_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...TVU_HEADERS,
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    debugLog("TVU", `Response: ${JSON.stringify(data).substring(0, 200)}`);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    logError("tvuRequest", error);
    throw error;
  }
}

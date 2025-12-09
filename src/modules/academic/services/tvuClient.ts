/**
 * TVU API Client - Ky-based HTTP client cho TVU Student Portal
 */

import ky, { type KyInstance } from 'ky';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logError } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const TVU_BASE_URL = 'https://ttsv.tvu.edu.vn';
const getTvuTimeout = () => CONFIG.tvu?.timeoutMs ?? 10000;

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

// ═══════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════

let cachedToken: string | null = null;
let tokenExpiry = 0;

export function setTvuToken(token: string, expiresIn = 3600): void {
  cachedToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
  debugLog('TVU', `Token set, expires in ${expiresIn}s`);
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
// KY INSTANCES
// ═══════════════════════════════════════════════════

const tvuHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Referer: 'https://ttsv.tvu.edu.vn',
};

// Public client (for login)
const tvuPublicApi: KyInstance = ky.create({
  prefixUrl: TVU_BASE_URL,
  timeout: getTvuTimeout(),
  retry: {
    limit: CONFIG.tvu?.retryLimit ?? 2,
    methods: ['post'],
    statusCodes: [408, 500, 502, 503, 504],
  },
  headers: tvuHeaders,
  hooks: {
    beforeRequest: [
      (request) => {
        debugLog('TVU', `→ ${request.method} ${request.url}`);
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        debugLog('TVU', `← ${response.status}`);
        return response;
      },
    ],
  },
});

// Authenticated client (for API calls)
function createAuthenticatedClient(): KyInstance {
  return ky.create({
    prefixUrl: TVU_BASE_URL,
    timeout: getTvuTimeout(),
    retry: {
      limit: CONFIG.tvu?.retryLimit ?? 2,
      methods: ['post'],
      statusCodes: [408, 500, 502, 503, 504],
    },
    headers: {
      ...tvuHeaders,
      'Content-Type': 'application/json',
    },
    hooks: {
      beforeRequest: [
        (request) => {
          const token = getTvuToken();
          if (!token) {
            throw new Error('Chưa đăng nhập TVU. Vui lòng đăng nhập trước.');
          }
          request.headers.set('Authorization', `Bearer ${token}`);
          debugLog('TVU', `→ ${request.method} ${request.url}`);
        },
      ],
      afterResponse: [
        (_request, _options, response) => {
          debugLog('TVU', `← ${response.status}`);
          return response;
        },
      ],
    },
  });
}

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Login TVU và lấy access token
 */
export async function tvuLogin(username: string, password: string): Promise<TvuLoginResponse> {
  debugLog('TVU', `Logging in as ${username}`);

  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const data = await tvuPublicApi
      .post('api/auth/login', {
        body: params.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .json<TvuLoginResponse>();

    // Lưu token
    if (data.access_token) {
      setTvuToken(data.access_token, data.expires_in || 3600);
    }

    debugLog('TVU', `✓ Login success for ${username}`);
    return data;
  } catch (error: any) {
    logError('tvuLogin', error);
    throw error;
  }
}

/**
 * Gọi TVU API với authentication
 */
export async function tvuRequest<T>(
  endpoint: string,
  body: any = {},
  extraHeaders?: Record<string, string>,
): Promise<TvuResponse<T>> {
  try {
    const client = createAuthenticatedClient();
    // Remove leading slash
    const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    const data = await client
      .post(path, {
        json: body,
        headers: extraHeaders,
      })
      .json<TvuResponse<T>>();

    debugLog('TVU', `✓ Response: ${JSON.stringify(data).substring(0, 200)}`);
    return data;
  } catch (error: any) {
    logError('tvuRequest', error);
    throw error;
  }
}

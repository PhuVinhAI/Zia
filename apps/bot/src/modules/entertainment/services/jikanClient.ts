/**
 * Jikan API Client - Ky-based client cho Jikan v4 API
 * https://api.jikan.moe/v4
 */

import ky, { type KyInstance } from 'ky';
import { debugLog } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

import { CONFIG } from '../../../core/config/config.js';

const BASE_URL = 'https://api.jikan.moe/v4';
const getRateLimitDelay = () => CONFIG.jikan?.rateLimitDelayMs ?? 350; // 3 requests/giây

let lastRequestTime = 0;

// ═══════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════

async function rateLimitWait(): Promise<void> {
  const rateLimitDelay = getRateLimitDelay();
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < rateLimitDelay) {
    await new Promise((r) => setTimeout(r, rateLimitDelay - elapsed));
  }
  lastRequestTime = Date.now();
}

// ═══════════════════════════════════════════════════
// KY INSTANCE
// ═══════════════════════════════════════════════════

const jikanApi: KyInstance = ky.create({
  prefixUrl: BASE_URL,
  timeout: CONFIG.jikan?.timeoutMs ?? 15000,
  retry: {
    limit: CONFIG.jikan?.retryLimit ?? 3,
    methods: ['get'],
    statusCodes: [408, 500, 502, 503, 504],
    backoffLimit: CONFIG.jikan?.backoffLimitMs ?? 3000,
  },
  hooks: {
    beforeRequest: [
      async (request) => {
        await rateLimitWait();
        debugLog('JIKAN', `→ ${request.url}`);
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        // Handle 429 rate limit
        if (response.status === 429) {
          const retryDelay = CONFIG.jikanRateLimitRetryMs ?? 2000;
          debugLog('JIKAN', `⚠ Rate limited (429), waiting ${retryDelay}ms...`);
          await new Promise((r) => setTimeout(r, retryDelay));
          throw new Error('Rate limited');
        }
        debugLog('JIKAN', `← ${response.status}`);
        return response;
      },
    ],
  },
});

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Fetch Jikan API
 */
export async function jikanFetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  // Build search params
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
  }

  // Remove leading slash if present
  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  return jikanApi.get(path, { searchParams }).json<T>();
}

// ═══════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanImage {
  jpg: { image_url: string; large_image_url: string };
  webp: { image_url: string; large_image_url: string };
}

export interface JikanGenre {
  mal_id: number;
  name: string;
  type: string;
}

export interface JikanAnime {
  mal_id: number;
  url: string;
  images: JikanImage;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  episodes: number | null;
  status: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  genres: JikanGenre[];
  studios: { mal_id: number; name: string }[];
  source: string | null;
  duration: string | null;
  rating: string | null;
  broadcast?: { string: string | null };
}

export interface JikanManga {
  mal_id: number;
  url: string;
  images: JikanImage;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  chapters: number | null;
  volumes: number | null;
  status: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  genres: JikanGenre[];
  authors: { mal_id: number; name: string }[];
}

export interface JikanListResponse<T> {
  data: T[];
  pagination: JikanPagination;
}

export interface JikanSingleResponse<T> {
  data: T;
}

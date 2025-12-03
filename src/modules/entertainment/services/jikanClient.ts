/**
 * Jikan API Client - Base client cho Jikan v4 API
 * https://api.jikan.moe/v4
 */
import { debugLog, logError } from "../../../core/logger/logger.js";

const BASE_URL = "https://api.jikan.moe/v4";
const RATE_LIMIT_DELAY = 350; // 3 requests/giây = ~333ms giữa mỗi request

let lastRequestTime = 0;

/**
 * Rate limiter - đảm bảo không vượt quá 3 req/s
 */
async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Fetch với retry khi gặp 429
 */
export async function jikanFetch<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  await rateLimitWait();

  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
  }

  debugLog("JIKAN", `Fetching: ${url.toString()}`);

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url.toString());

      if (response.status === 429) {
        debugLog("JIKAN", "Rate limited (429), waiting 2s...");
        await new Promise((r) => setTimeout(r, 2000));
        retries--;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      logError("jikanFetch", error);
      if (retries <= 1) throw error;
      retries--;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Max retries exceeded");
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

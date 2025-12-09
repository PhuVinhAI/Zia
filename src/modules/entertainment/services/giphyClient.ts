/**
 * Giphy API Client - Ky-based client cho Giphy API
 * https://developers.giphy.com/docs/api
 */

import ky, { type KyInstance } from 'ky';
import { debugLog } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const BASE_URL = 'https://api.giphy.com/v1';
const API_KEY = process.env.GIPHY_API_KEY || '';

// ═══════════════════════════════════════════════════
// KY INSTANCE
// ═══════════════════════════════════════════════════

import { CONFIG } from '../../../core/config/config.js';

const giphyApi: KyInstance = ky.create({
  prefixUrl: BASE_URL,
  timeout: CONFIG.giphy?.timeoutMs ?? 15000,
  retry: {
    limit: CONFIG.giphy?.retryLimit ?? 2,
    methods: ['get'],
    statusCodes: [408, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        debugLog('GIPHY', `→ ${request.url}`);
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        debugLog('GIPHY', `← ${response.status}`);
        return response;
      },
    ],
  },
});

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Search GIFs by keyword
 */
export async function searchGifs(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    rating?: GiphyRating;
    lang?: string;
  } = {},
): Promise<GiphySearchResponse> {
  const defaultLimit = CONFIG.giphy?.defaultLimit ?? 10;
  const defaultRating = CONFIG.giphy?.defaultRating ?? 'g';
  const searchParams = new URLSearchParams({
    api_key: API_KEY,
    q: query,
    limit: String(options.limit || defaultLimit),
    offset: String(options.offset || 0),
    rating: options.rating || defaultRating,
    lang: options.lang || 'en',
  });

  return giphyApi.get('gifs/search', { searchParams }).json<GiphySearchResponse>();
}

/**
 * Get trending GIFs
 */
export async function getTrendingGifs(
  options: { limit?: number; offset?: number; rating?: GiphyRating } = {},
): Promise<GiphySearchResponse> {
  const searchParams = new URLSearchParams({
    api_key: API_KEY,
    limit: String(options.limit || 10),
    offset: String(options.offset || 0),
    rating: options.rating || 'g',
  });

  return giphyApi.get('gifs/trending', { searchParams }).json<GiphySearchResponse>();
}

/**
 * Get random GIF
 */
export async function getRandomGif(
  options: { tag?: string; rating?: GiphyRating } = {},
): Promise<GiphyRandomResponse> {
  const searchParams = new URLSearchParams({
    api_key: API_KEY,
    rating: options.rating || 'g',
  });

  if (options.tag) {
    searchParams.set('tag', options.tag);
  }

  return giphyApi.get('gifs/random', { searchParams }).json<GiphyRandomResponse>();
}

// ═══════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════

export type GiphyRating = 'y' | 'g' | 'pg' | 'pg-13' | 'r';

export interface GiphyImage {
  url: string;
  width: string;
  height: string;
  size?: string;
  mp4?: string;
  mp4_size?: string;
  webp?: string;
  webp_size?: string;
}

export interface GiphyGif {
  id: string;
  slug: string;
  url: string;
  bitly_url: string;
  embed_url: string;
  title: string;
  rating: GiphyRating;
  images: {
    original: GiphyImage;
    downsized: GiphyImage;
    downsized_medium: GiphyImage;
    downsized_small: GiphyImage;
    fixed_height: GiphyImage;
    fixed_height_small: GiphyImage;
    fixed_width: GiphyImage;
    fixed_width_small: GiphyImage;
    preview_gif: GiphyImage;
    preview_webp: GiphyImage;
  };
  user?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

export interface GiphyRandomResponse {
  data: GiphyGif;
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
}

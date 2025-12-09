/**
 * Nekos API Client - Ky-based client cho Nekos API v4
 * https://api.nekosapi.com/v4
 */

import ky, { type KyInstance } from 'ky';
import { debugLog } from '../../../core/logger/logger.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const BASE_URL = 'https://api.nekosapi.com/v4';

// ═══════════════════════════════════════════════════
// KY INSTANCE
// ═══════════════════════════════════════════════════

import { CONFIG } from '../../../core/config/config.js';

const nekosApi: KyInstance = ky.create({
  prefixUrl: BASE_URL,
  timeout: CONFIG.nekos?.timeoutMs ?? 15000,
  retry: {
    limit: CONFIG.nekos?.retryLimit ?? 2,
    methods: ['get'],
    statusCodes: [408, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        debugLog('NEKOS', `→ ${request.url}`);
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        debugLog('NEKOS', `← ${response.status}`);
        return response;
      },
    ],
  },
});

// ═══════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Fetch Nekos API
 */
export async function nekosFetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        // Handle arrays (comma-delimited)
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
  }

  const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return nekosApi.get(path, { searchParams }).json<T>();
}

// ═══════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════

export type NekosRating = 'safe' | 'suggestive' | 'borderline' | 'explicit';

export interface NekosImage {
  id: number;
  id_v2?: string;
  url?: string; // v4 random endpoint
  image_url?: string; // v4 search endpoint
  sample_url?: string;
  image_size?: number;
  image_width?: number;
  image_height?: number;
  sample_size?: number;
  sample_width?: number;
  sample_height?: number;
  source?: string | null;
  source_url?: string | null;
  source_id?: number | null;
  rating: NekosRating;
  verification?: string;
  hash_md5?: string;
  hash_perceptual?: string;
  color_dominant?: number[];
  color_palette?: number[][];
  duration?: number | null;
  is_original?: boolean;
  is_screenshot?: boolean;
  is_flagged?: boolean;
  is_animated?: boolean;
  artist?: NekosArtist | null;
  artist_name?: string | null; // v4 random endpoint
  characters?: NekosCharacter[];
  tags: (NekosTag | string)[];
  created_at?: number;
  updated_at?: number;
}

export interface NekosArtist {
  id: number;
  id_v2: string;
  name: string;
  aliases: string[];
  image_url: string | null;
  links: string[];
  policy_repost: string | null;
  policy_credit: boolean;
  policy_ai: boolean;
}

export interface NekosCharacter {
  id: number;
  id_v2: string;
  name: string;
  aliases: string[];
  description: string | null;
  ages: number[];
  height: number | null;
  weight: number | null;
  gender: string | null;
  species: string | null;
  birthday: string | null;
  nationality: string | null;
  occupations: string[];
}

export interface NekosTag {
  id: number;
  id_v2: string;
  name: string;
  description: string | null;
  sub: string | null;
  is_nsfw: boolean;
}

// API v4 trả về array trực tiếp cho /images/random
// và { items: [], count: number } cho /images (search)
export type NekosRandomResponse = NekosImage[];

export interface NekosSearchResponse {
  items: NekosImage[];
  count: number;
}

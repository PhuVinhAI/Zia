/**
 * Steam API Client
 * Sử dụng Steam Store API và SteamSpy API (public, không cần API key)
 * Docs: https://store.steampowered.com/api/
 * SteamSpy: https://steamspy.com/api.php
 */

import { debugLog } from '../../../core/logger/logger.js';
import { http } from '../../../shared/utils/httpClient.js';

const STEAM_STORE_API = 'https://store.steampowered.com/api';
const STEAM_SPY_API = 'https://steamspy.com/api.php';
const STEAM_WEB_API = 'https://api.steampowered.com';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

export interface SteamGameDetails {
  appId: number;
  name: string;
  type: string;
  description: string;
  shortDescription: string;
  headerImage: string;
  website: string | null;
  developers: string[];
  publishers: string[];
  isFree: boolean;
  price: {
    currency: string;
    initial: number;
    final: number;
    discountPercent: number;
    formatted: string;
  } | null;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  categories: string[];
  genres: string[];
  releaseDate: string;
  metacritic: {
    score: number;
    url: string;
  } | null;
  recommendations: number;
  achievements: number;
  screenshots: string[];
  movies: Array<{
    id: number;
    name: string;
    thumbnail: string;
    webm: string;
    mp4: string;
  }>;
  supportedLanguages: string;
  requiredAge: number;
}

export interface SteamSearchResult {
  appId: number;
  name: string;
  icon: string;
  logo: string;
}

export interface SteamTopGame {
  appId: number;
  name: string;
  currentPlayers: number;
  peakPlayers: number;
  priceFormatted: string;
  discount: number;
  owners: string;
  score: number;
}

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} ngày ${remainingHours}h`;
}

// ═══════════════════════════════════════════════════
// STEAM STORE API (Public - No API Key Required)
// ═══════════════════════════════════════════════════

/**
 * Lấy chi tiết game từ Steam Store
 */
export async function getGameDetails(appId: number): Promise<SteamGameDetails | null> {
  try {
    debugLog('STEAM', `Fetching game details: ${appId}`);

    const response = await http
      .get(`${STEAM_STORE_API}/appdetails`, {
        searchParams: {
          appids: appId.toString(),
          cc: 'vn', // Vietnam pricing
          l: 'vietnamese',
        },
      })
      .json<Record<string, { success: boolean; data: any }>>();

    const result = response[appId.toString()];
    if (!result?.success || !result.data) {
      debugLog('STEAM', `Game not found: ${appId}`);
      return null;
    }

    const data = result.data;

    const gameDetails: SteamGameDetails = {
      appId: data.steam_appid,
      name: data.name,
      type: data.type,
      description: data.detailed_description || '',
      shortDescription: data.short_description || '',
      headerImage: data.header_image,
      website: data.website,
      developers: data.developers || [],
      publishers: data.publishers || [],
      isFree: data.is_free,
      price: data.price_overview
        ? {
            currency: data.price_overview.currency,
            initial: data.price_overview.initial / 100,
            final: data.price_overview.final / 100,
            discountPercent: data.price_overview.discount_percent,
            formatted: data.price_overview.final_formatted,
          }
        : null,
      platforms: {
        windows: data.platforms?.windows || false,
        mac: data.platforms?.mac || false,
        linux: data.platforms?.linux || false,
      },
      categories: data.categories?.map((c: any) => c.description) || [],
      genres: data.genres?.map((g: any) => g.description) || [],
      releaseDate: data.release_date?.date || 'TBA',
      metacritic: data.metacritic
        ? {
            score: data.metacritic.score,
            url: data.metacritic.url,
          }
        : null,
      recommendations: data.recommendations?.total || 0,
      achievements: data.achievements?.total || 0,
      screenshots: data.screenshots?.slice(0, 5).map((s: any) => s.path_thumbnail) || [],
      movies:
        data.movies?.slice(0, 3).map((m: any) => ({
          id: m.id,
          name: m.name,
          thumbnail: m.thumbnail,
          webm: m.webm?.max || m.webm?.['480'],
          mp4: m.mp4?.max || m.mp4?.['480'],
        })) || [],
      supportedLanguages: data.supported_languages?.replace(/<[^>]*>/g, '') || '',
      requiredAge: data.required_age || 0,
    };

    debugLog('STEAM', `✓ Got game: ${gameDetails.name}`);
    return gameDetails;
  } catch (error: any) {
    debugLog('STEAM', `Error fetching game ${appId}: ${error.message}`);
    return null;
  }
}

/**
 * Tìm kiếm game trên Steam
 */
export async function searchGames(query: string, limit = 10): Promise<SteamSearchResult[]> {
  try {
    debugLog('STEAM', `Searching: ${query}`);

    // Sử dụng Steam Store search API
    const response = await http
      .get('https://store.steampowered.com/search/suggest', {
        searchParams: {
          term: query,
          f: 'games',
          cc: 'VN',
          realm: '1',
          l: 'vietnamese',
        },
        headers: {
          Accept: 'text/html',
        },
      })
      .text();

    // Parse HTML response
    const results: SteamSearchResult[] = [];
    const regex =
      /data-ds-appid="(\d+)"[^>]*>.*?<div class="match_name">([^<]+)<\/div>.*?<img[^>]*src="([^"]+)"/gs;

    let match;
    while ((match = regex.exec(response)) !== null && results.length < limit) {
      results.push({
        appId: parseInt(match[1], 10),
        name: match[2].trim(),
        icon: match[3],
        logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${match[1]}/header.jpg`,
      });
    }

    debugLog('STEAM', `✓ Found ${results.length} games for "${query}"`);
    return results;
  } catch (error: any) {
    debugLog('STEAM', `Search error: ${error.message}`);
    return [];
  }
}

/**
 * Lấy số người chơi hiện tại của game (Public API)
 */
export async function getCurrentPlayers(appId: number): Promise<number | null> {
  try {
    const response = await http
      .get(`${STEAM_WEB_API}/ISteamUserStats/GetNumberOfCurrentPlayers/v1`, {
        searchParams: { appid: appId.toString() },
      })
      .json<{ response: { player_count?: number; result?: number } }>();

    if (response.response.result === 1) {
      return response.response.player_count || 0;
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════
// STEAMSPY API (Public - Game Statistics)
// ═══════════════════════════════════════════════════

/**
 * Lấy top games từ SteamSpy
 */
export async function getTopGames(
  mode: 'top100in2weeks' | 'top100forever' | 'top100owned' = 'top100in2weeks',
  limit = 20,
): Promise<SteamTopGame[]> {
  try {
    debugLog('STEAM', `Fetching top games: ${mode}`);

    const response = await http
      .get(STEAM_SPY_API, {
        searchParams: { request: mode },
      })
      .json<Record<string, any>>();

    const games: SteamTopGame[] = Object.entries(response)
      .slice(0, limit)
      .map(([appId, data]: [string, any]) => ({
        appId: parseInt(appId, 10),
        name: data.name,
        currentPlayers: data.ccu || 0,
        peakPlayers: data.peak_ccu || 0,
        priceFormatted: data.price ? `$${(data.price / 100).toFixed(2)}` : 'Free',
        discount: data.discount ? parseInt(data.discount, 10) : 0,
        owners: data.owners || '0',
        score: data.score_rank ? parseInt(data.score_rank, 10) : 0,
      }));

    debugLog('STEAM', `✓ Got ${games.length} top games`);
    return games;
  } catch (error: any) {
    debugLog('STEAM', `Top games error: ${error.message}`);
    return [];
  }
}

/**
 * Lấy thống kê game từ SteamSpy
 */
export async function getGameStats(appId: number): Promise<{
  owners: string;
  playersForever: number;
  players2Weeks: number;
  averageForever: number;
  average2Weeks: number;
  medianForever: number;
  median2Weeks: number;
  ccu: number;
  price: string;
  score: number;
  tags: Record<string, number>;
} | null> {
  try {
    debugLog('STEAM', `Fetching game stats: ${appId}`);

    const response = await http
      .get(STEAM_SPY_API, {
        searchParams: { request: 'appdetails', appid: appId.toString() },
      })
      .json<any>();

    if (!response || response.name === undefined) {
      return null;
    }

    return {
      owners: response.owners || '0',
      playersForever: response.players_forever || 0,
      players2Weeks: response.players_2weeks || 0,
      averageForever: response.average_forever || 0,
      average2Weeks: response.average_2weeks || 0,
      medianForever: response.median_forever || 0,
      median2Weeks: response.median_2weeks || 0,
      ccu: response.ccu || 0,
      price: response.price ? `$${(response.price / 100).toFixed(2)}` : 'Free',
      score: response.score_rank ? parseInt(response.score_rank, 10) : 0,
      tags: response.tags || {},
    };
  } catch (error: any) {
    debugLog('STEAM', `Game stats error: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════
// COMBINED FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Lấy thông tin đầy đủ của game (kết hợp Store + SteamSpy)
 */
export async function getFullGameInfo(appId: number): Promise<{
  details: SteamGameDetails;
  stats: Awaited<ReturnType<typeof getGameStats>>;
  currentPlayers: number | null;
} | null> {
  const details = await getGameDetails(appId);
  if (!details) return null;

  const [stats, currentPlayers] = await Promise.all([
    getGameStats(appId),
    getCurrentPlayers(appId),
  ]);

  return { details, stats, currentPlayers };
}

// Export helper
export { formatPlaytime };

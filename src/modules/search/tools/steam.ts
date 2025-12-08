/**
 * Tool: steam - Tra cứu thông tin game Steam
 * Sử dụng Steam Store API và SteamSpy API (public, không cần API key)
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  SteamGameSchema,
  SteamSearchSchema,
  SteamTopGamesSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  formatPlaytime,
  getFullGameInfo,
  getTopGames,
  searchGames,
} from '../services/steamClient.js';

/**
 * Tool: steamSearch - Tìm kiếm game trên Steam
 */
export const steamSearchTool: ToolDefinition = {
  name: 'steamSearch',
  description:
    'Tìm kiếm game trên Steam theo tên. Trả về danh sách game với appId, tên, và hình ảnh.',
  parameters: [
    { name: 'query', type: 'string', description: 'Tên game cần tìm', required: true },
    {
      name: 'limit',
      type: 'number',
      description: 'Số kết quả (1-20, mặc định 10)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(SteamSearchSchema, params, 'steamSearch');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const results = await searchGames(data.query, data.limit);

      if (results.length === 0) {
        return {
          success: true,
          data: { query: data.query, results: [], message: 'Không tìm thấy game nào' },
        };
      }

      debugLog('STEAM', `Found ${results.length} games for "${data.query}"`);

      return {
        success: true,
        data: {
          query: data.query,
          count: results.length,
          results: results.map((g) => ({
            appId: g.appId,
            name: g.name,
            storeUrl: `https://store.steampowered.com/app/${g.appId}`,
            headerImage: g.logo,
          })),
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tìm kiếm Steam: ${error.message}` };
    }
  },
};

/**
 * Tool: steamGame - Xem chi tiết game Steam
 */
export const steamGameTool: ToolDefinition = {
  name: 'steamGame',
  description:
    'Xem thông tin chi tiết game Steam: giá, đánh giá, mô tả, số người chơi, thống kê, screenshots.',
  parameters: [
    { name: 'appId', type: 'number', description: 'Steam App ID của game', required: true },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(SteamGameSchema, params, 'steamGame');
    if (!validation.success) return { success: false, error: validation.error };
    const { appId } = validation.data;

    try {
      const info = await getFullGameInfo(appId);

      if (!info) {
        return { success: false, error: `Không tìm thấy game với App ID: ${appId}` };
      }

      const { details, stats, currentPlayers } = info;

      debugLog('STEAM', `Got game details: ${details.name}`);

      return {
        success: true,
        data: {
          appId: details.appId,
          name: details.name,
          type: details.type,
          storeUrl: `https://store.steampowered.com/app/${details.appId}`,
          headerImage: details.headerImage,
          description: details.shortDescription,
          developers: details.developers,
          publishers: details.publishers,
          releaseDate: details.releaseDate,
          price: details.isFree
            ? { isFree: true, formatted: 'Miễn phí' }
            : details.price
              ? {
                  isFree: false,
                  original: details.price.initial,
                  final: details.price.final,
                  discount:
                    details.price.discountPercent > 0 ? `${details.price.discountPercent}%` : null,
                  formatted: details.price.formatted,
                }
              : null,
          platforms: details.platforms,
          genres: details.genres,
          categories: details.categories.slice(0, 5),
          metacritic: details.metacritic,
          recommendations: details.recommendations,
          achievements: details.achievements,
          requiredAge: details.requiredAge > 0 ? `${details.requiredAge}+` : 'Mọi lứa tuổi',
          currentPlayers: currentPlayers,
          stats: stats
            ? {
                owners: stats.owners,
                averagePlaytime: formatPlaytime(stats.averageForever),
                medianPlaytime: formatPlaytime(stats.medianForever),
                peakConcurrent: stats.ccu,
                topTags: Object.entries(stats.tags)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([tag]) => tag),
              }
            : null,
          screenshots: details.screenshots.slice(0, 3),
          trailers: details.movies.slice(0, 1).map((m) => ({
            name: m.name,
            thumbnail: m.thumbnail,
            url: m.mp4,
          })),
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy thông tin game: ${error.message}` };
    }
  },
};

/**
 * Tool: steamTop - Xem top games trên Steam
 */
export const steamTopTool: ToolDefinition = {
  name: 'steamTop',
  description:
    'Xem danh sách top games trên Steam theo số người chơi, doanh thu, hoặc số lượng sở hữu.',
  parameters: [
    {
      name: 'mode',
      type: 'string',
      description: 'Loại xếp hạng: top100in2weeks (mặc định), top100forever, top100owned',
      required: false,
    },
    { name: 'limit', type: 'number', description: 'Số game (1-50, mặc định 20)', required: false },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(SteamTopGamesSchema, params, 'steamTop');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const games = await getTopGames(data.mode, data.limit);

      if (games.length === 0) {
        return { success: false, error: 'Không thể lấy danh sách top games' };
      }

      const modeLabels: Record<string, string> = {
        top100in2weeks: 'Top games 2 tuần qua',
        top100forever: 'Top games mọi thời đại',
        top100owned: 'Top games được sở hữu nhiều nhất',
      };

      debugLog('STEAM', `Got ${games.length} top games (${data.mode})`);

      return {
        success: true,
        data: {
          mode: data.mode,
          modeLabel: modeLabels[data.mode],
          count: games.length,
          games: games.map((g, i) => ({
            rank: i + 1,
            appId: g.appId,
            name: g.name,
            storeUrl: `https://store.steampowered.com/app/${g.appId}`,
            currentPlayers: g.currentPlayers,
            peakPlayers: g.peakPlayers,
            price: g.priceFormatted,
            discount: g.discount > 0 ? `${g.discount}%` : null,
            owners: g.owners,
          })),
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy top games: ${error.message}` };
    }
  },
};

/**
 * Tool: jikanSeason - Anime theo mùa và lịch phát sóng
 */

import {
  JikanSeasonSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { type JikanAnime, type JikanListResponse, jikanFetch } from '../services/jikanClient.js';

export const jikanSeasonTool: ToolDefinition = {
  name: 'jikanSeason',
  description:
    'Lấy danh sách anime theo mùa (hiện tại, sắp tới) hoặc lịch phát sóng theo ngày trong tuần.',
  parameters: [
    {
      name: 'mode',
      type: 'string',
      description:
        "Chế độ: 'now' (mùa hiện tại), 'upcoming' (sắp chiếu), 'schedule' (lịch theo ngày)",
      required: false,
    },
    {
      name: 'day',
      type: 'string',
      description:
        'Ngày trong tuần (chỉ dùng với mode=schedule): monday, tuesday, wednesday, thursday, friday, saturday, sunday',
      required: false,
    },
    {
      name: 'page',
      type: 'number',
      description: 'Số trang (mặc định: 1)',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Số kết quả (tối đa 25)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(JikanSeasonSchema, params, 'jikanSeason');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      let endpoint: string;
      switch (data.mode) {
        case 'upcoming':
          endpoint = '/seasons/upcoming';
          break;
        case 'schedule':
          endpoint = '/schedules';
          break;
        default:
          endpoint = '/seasons/now';
      }

      const queryParams: Record<string, any> = {
        page: data.page,
        limit: data.limit,
      };

      if (data.mode === 'schedule' && data.day) {
        queryParams.filter = data.day.toLowerCase();
      }

      const response = await jikanFetch<JikanListResponse<JikanAnime>>(endpoint, queryParams);

      const results = response.data.map((anime) => ({
        id: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english,
        type: anime.type,
        episodes: anime.episodes,
        status: anime.status,
        score: anime.score,
        season: anime.season,
        year: anime.year,
        broadcast: anime.broadcast?.string,
        genres: anime.genres?.map((g) => g.name).join(', '),
        studios: anime.studios?.map((s) => s.name).join(', '),
        image: anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url,
        url: anime.url,
      }));

      return {
        success: true,
        data: {
          mode: data.mode,
          day: data.day,
          results,
          pagination: {
            currentPage: response.pagination.current_page,
            totalPages: response.pagination.last_visible_page,
            hasNextPage: response.pagination.has_next_page,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy anime theo mùa: ${error.message}`,
      };
    }
  },
};

/**
 * Tool: jikanTop - Bảng xếp hạng Anime/Manga
 */

import { JikanTopSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  type JikanAnime,
  type JikanListResponse,
  type JikanManga,
  jikanFetch,
} from '../services/jikanClient.js';

export const jikanTopTool: ToolDefinition = {
  name: 'jikanTop',
  description:
    'Lấy bảng xếp hạng top anime hoặc manga. Có thể lọc theo loại (TV, Movie...) và tiêu chí (đang chiếu, phổ biến nhất, yêu thích nhất).',
  parameters: [
    {
      name: 'mediaType',
      type: 'string',
      description: "Loại: 'anime' hoặc 'manga' (mặc định: anime)",
      required: false,
    },
    {
      name: 'type',
      type: 'string',
      description:
        'Lọc theo loại: tv, movie, ova, special, ona, music (anime) hoặc manga, novel, lightnovel, oneshot, doujin, manhwa, manhua (manga)',
      required: false,
    },
    {
      name: 'filter',
      type: 'string',
      description:
        'Tiêu chí: airing (đang chiếu), upcoming (sắp chiếu), bypopularity (phổ biến nhất), favorite (yêu thích nhất)',
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
    const validation = validateParams(JikanTopSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const endpoint = `/top/${data.mediaType}`;

      const queryParams: Record<string, any> = {
        type: data.type,
        filter: data.filter,
        page: data.page,
        limit: data.limit,
      };

      const response = await jikanFetch<JikanListResponse<JikanAnime | JikanManga>>(
        endpoint,
        queryParams,
      );

      const results = response.data.map((item, index) => ({
        rank: item.rank || (response.pagination.current_page - 1) * data.limit + index + 1,
        id: item.mal_id,
        title: item.title,
        titleEnglish: item.title_english,
        type: item.type,
        score: item.score,
        members: item.members,
        favorites: item.favorites,
        status: item.status,
        image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
        url: item.url,
        ...('episodes' in item ? { episodes: item.episodes } : {}),
        ...('chapters' in item ? { chapters: (item as JikanManga).chapters } : {}),
      }));

      return {
        success: true,
        data: {
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
        error: `Lỗi lấy bảng xếp hạng: ${error.message}`,
      };
    }
  },
};

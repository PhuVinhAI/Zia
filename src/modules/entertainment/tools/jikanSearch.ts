/**
 * Tool: jikanSearch - Tìm kiếm Anime/Manga
 */

import {
  JikanSearchSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  type JikanAnime,
  type JikanListResponse,
  type JikanManga,
  jikanFetch,
} from '../services/jikanClient.js';

export const jikanSearchTool: ToolDefinition = {
  name: 'jikanSearch',
  description:
    'Tìm kiếm anime hoặc manga theo từ khóa, thể loại, trạng thái, điểm số. Hỗ trợ lọc và sắp xếp kết quả.',
  parameters: [
    {
      name: 'q',
      type: 'string',
      description: 'Từ khóa tìm kiếm',
      required: false,
    },
    {
      name: 'mediaType',
      type: 'string',
      description: "Loại media: 'anime' hoặc 'manga' (mặc định: anime)",
      required: false,
    },
    {
      name: 'type',
      type: 'string',
      description:
        'Loại: tv, movie, ova, special, ona, music (anime) hoặc manga, novel, lightnovel, oneshot, doujin, manhwa, manhua (manga)',
      required: false,
    },
    {
      name: 'status',
      type: 'string',
      description:
        'Trạng thái: airing, complete, upcoming (anime) hoặc publishing, complete, hiatus, discontinued (manga)',
      required: false,
    },
    {
      name: 'minScore',
      type: 'number',
      description: 'Điểm số tối thiểu (1-10)',
      required: false,
    },
    {
      name: 'genres',
      type: 'string',
      description: 'ID thể loại, cách nhau bởi dấu phẩy (VD: 1,2 = Action, Adventure)',
      required: false,
    },
    {
      name: 'orderBy',
      type: 'string',
      description: 'Sắp xếp theo: title, score, popularity, favorites, rank',
      required: false,
    },
    {
      name: 'sort',
      type: 'string',
      description: 'Chiều sắp xếp: desc hoặc asc',
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
      description: 'Số kết quả mỗi trang (tối đa 25)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(JikanSearchSchema, params, 'jikanSearch');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const endpoint = data.mediaType === 'manga' ? '/manga' : '/anime';

      const queryParams: Record<string, any> = {
        q: data.q,
        type: data.type,
        status: data.status,
        min_score: data.minScore,
        genres: data.genres,
        order_by: data.orderBy,
        sort: data.sort,
        page: data.page,
        limit: data.limit,
      };

      const response = await jikanFetch<JikanListResponse<JikanAnime | JikanManga>>(
        endpoint,
        queryParams,
      );

      const results = response.data.map((item) => ({
        id: item.mal_id,
        title: item.title,
        titleEnglish: item.title_english,
        type: item.type,
        status: item.status,
        score: item.score,
        image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
        synopsis:
          item.synopsis?.substring(0, 200) +
          (item.synopsis && item.synopsis.length > 200 ? '...' : ''),
        genres: item.genres?.map((g) => g.name).join(', '),
        url: item.url,
        ...('episodes' in item ? { episodes: item.episodes } : {}),
        ...('chapters' in item
          ? {
              chapters: (item as JikanManga).chapters,
              volumes: (item as JikanManga).volumes,
            }
          : {}),
      }));

      return {
        success: true,
        data: {
          results,
          pagination: {
            currentPage: response.pagination.current_page,
            totalPages: response.pagination.last_visible_page,
            hasNextPage: response.pagination.has_next_page,
            totalItems: response.pagination.items.total,
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tìm kiếm: ${error.message}` };
    }
  },
};

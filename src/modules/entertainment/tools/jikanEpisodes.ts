/**
 * Tool: jikanEpisodes - Lấy danh sách tập phim
 */

import { JikanEpisodesSchema, validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { type JikanPagination, jikanFetch } from '../services/jikanClient.js';

interface EpisodesResponse {
  data: {
    mal_id: number;
    url: string;
    title: string;
    title_japanese: string | null;
    title_romanji: string | null;
    aired: string | null;
    score: number | null;
    filler: boolean;
    recap: boolean;
  }[];
  pagination: JikanPagination;
}

export const jikanEpisodesTool: ToolDefinition = {
  name: 'jikanEpisodes',
  description:
    'Lấy danh sách các tập phim của một anime. Bao gồm tiêu đề, ngày phát sóng, điểm số từng tập.',
  parameters: [
    {
      name: 'id',
      type: 'number',
      description: 'MAL ID của anime',
      required: true,
    },
    {
      name: 'page',
      type: 'number',
      description: 'Số trang (mặc định: 1, mỗi trang 100 tập)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(JikanEpisodesSchema, params, 'jikanEpisodes');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const endpoint = `/anime/${data.id}/episodes`;
      const queryParams = { page: data.page };

      const response = await jikanFetch<EpisodesResponse>(endpoint, queryParams);

      const episodes = response.data.map((ep) => ({
        number: ep.mal_id,
        title: ep.title,
        titleJapanese: ep.title_japanese,
        aired: ep.aired,
        score: ep.score,
        isFiller: ep.filler,
        isRecap: ep.recap,
        url: ep.url,
      }));

      return {
        success: true,
        data: {
          animeId: data.id,
          episodes,
          pagination: {
            currentPage: response.pagination.current_page,
            totalPages: response.pagination.last_visible_page,
            hasNextPage: response.pagination.has_next_page,
            totalEpisodes: response.pagination.items.total,
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy danh sách tập: ${error.message}`,
      };
    }
  },
};

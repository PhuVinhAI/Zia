/**
 * Tool: jikanEpisodes - Lấy danh sách tập phim
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { jikanFetch, JikanPagination } from "../services/jikanClient.js";

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
  name: "jikanEpisodes",
  description:
    "Lấy danh sách các tập phim của một anime. Bao gồm tiêu đề, ngày phát sóng, điểm số từng tập.",
  parameters: [
    {
      name: "id",
      type: "number",
      description: "MAL ID của anime",
      required: true,
    },
    {
      name: "page",
      type: "number",
      description: "Số trang (mặc định: 1, mỗi trang 100 tập)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    try {
      if (!params.id) {
        return { success: false, error: "Thiếu ID anime" };
      }

      const endpoint = `/anime/${params.id}/episodes`;
      const queryParams = { page: params.page || 1 };

      const response = await jikanFetch<EpisodesResponse>(
        endpoint,
        queryParams
      );

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
          animeId: params.id,
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

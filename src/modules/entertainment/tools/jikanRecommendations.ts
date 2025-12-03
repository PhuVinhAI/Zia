/**
 * Tool: jikanRecommendations - Gợi ý anime/manga tương tự
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { jikanFetch } from "../services/jikanClient.js";

interface RecommendationResponse {
  data: {
    entry: {
      mal_id: number;
      url: string;
      images: {
        webp?: { large_image_url: string };
        jpg: { large_image_url: string };
      };
      title: string;
    };
    votes: number;
  }[];
}

export const jikanRecommendationsTool: ToolDefinition = {
  name: "jikanRecommendations",
  description:
    "Lấy danh sách anime/manga được gợi ý tương tự với một anime/manga cụ thể (dựa trên vote của người dùng MAL).",
  parameters: [
    {
      name: "id",
      type: "number",
      description: "MAL ID của anime/manga gốc",
      required: true,
    },
    {
      name: "mediaType",
      type: "string",
      description: "Loại: 'anime' hoặc 'manga' (mặc định: anime)",
      required: false,
    },
    {
      name: "limit",
      type: "number",
      description: "Số gợi ý tối đa (mặc định: 10)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    try {
      if (!params.id) {
        return { success: false, error: "Thiếu ID anime/manga" };
      }

      const mediaType = params.mediaType || "anime";
      const endpoint = `/${mediaType}/${params.id}/recommendations`;
      const limit = params.limit || 10;

      const response = await jikanFetch<RecommendationResponse>(endpoint);

      const recommendations = response.data.slice(0, limit).map((item) => ({
        id: item.entry.mal_id,
        title: item.entry.title,
        votes: item.votes,
        image:
          item.entry.images?.webp?.large_image_url ||
          item.entry.images?.jpg?.large_image_url,
        url: item.entry.url,
      }));

      return {
        success: true,
        data: {
          sourceId: params.id,
          totalRecommendations: response.data.length,
          recommendations,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy gợi ý: ${error.message}` };
    }
  },
};

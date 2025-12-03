/**
 * Tool: jikanGenres - Lấy danh sách thể loại
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { jikanFetch } from "../services/jikanClient.js";

interface GenresResponse {
  data: {
    mal_id: number;
    name: string;
    url: string;
    count: number;
  }[];
}

export const jikanGenresTool: ToolDefinition = {
  name: "jikanGenres",
  description:
    "Lấy danh sách tất cả thể loại (genres) của anime hoặc manga. Dùng để biết ID thể loại khi tìm kiếm.",
  parameters: [
    {
      name: "mediaType",
      type: "string",
      description: "Loại: 'anime' hoặc 'manga' (mặc định: anime)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    try {
      const mediaType = params.mediaType || "anime";
      const endpoint = `/genres/${mediaType}`;

      const response = await jikanFetch<GenresResponse>(endpoint);

      const genres = response.data.map((g) => ({
        id: g.mal_id,
        name: g.name,
        count: g.count,
      }));

      return {
        success: true,
        data: {
          mediaType,
          totalGenres: genres.length,
          genres,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy thể loại: ${error.message}` };
    }
  },
};

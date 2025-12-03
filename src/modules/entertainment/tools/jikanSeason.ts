/**
 * Tool: jikanSeason - Anime theo mùa và lịch phát sóng
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import {
  jikanFetch,
  JikanAnime,
  JikanListResponse,
} from "../services/jikanClient.js";

export const jikanSeasonTool: ToolDefinition = {
  name: "jikanSeason",
  description:
    "Lấy danh sách anime theo mùa (hiện tại, sắp tới) hoặc lịch phát sóng theo ngày trong tuần.",
  parameters: [
    {
      name: "mode",
      type: "string",
      description:
        "Chế độ: 'now' (mùa hiện tại), 'upcoming' (sắp chiếu), 'schedule' (lịch theo ngày)",
      required: false,
    },
    {
      name: "day",
      type: "string",
      description:
        "Ngày trong tuần (chỉ dùng với mode=schedule): monday, tuesday, wednesday, thursday, friday, saturday, sunday",
      required: false,
    },
    {
      name: "page",
      type: "number",
      description: "Số trang (mặc định: 1)",
      required: false,
    },
    {
      name: "limit",
      type: "number",
      description: "Số kết quả (tối đa 25)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    try {
      const mode = params.mode || "now";
      let endpoint: string;

      switch (mode) {
        case "upcoming":
          endpoint = "/seasons/upcoming";
          break;
        case "schedule":
          endpoint = "/schedules";
          break;
        default:
          endpoint = "/seasons/now";
      }

      const queryParams: Record<string, any> = {
        page: params.page || 1,
        limit: Math.min(params.limit || 10, 25),
      };

      if (mode === "schedule" && params.day) {
        queryParams.filter = params.day.toLowerCase();
      }

      const response = await jikanFetch<JikanListResponse<JikanAnime>>(
        endpoint,
        queryParams
      );

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
        genres: anime.genres?.map((g) => g.name).join(", "),
        studios: anime.studios?.map((s) => s.name).join(", "),
        image:
          anime.images?.webp?.large_image_url ||
          anime.images?.jpg?.large_image_url,
        url: anime.url,
      }));

      return {
        success: true,
        data: {
          mode,
          day: params.day,
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

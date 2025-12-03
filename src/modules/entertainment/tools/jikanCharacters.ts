/**
 * Tool: jikanCharacters - Lấy danh sách nhân vật của Anime/Manga
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { jikanFetch } from "../services/jikanClient.js";

interface CharacterResponse {
  data: {
    character: {
      mal_id: number;
      url: string;
      images: { webp?: { image_url: string }; jpg: { image_url: string } };
      name: string;
    };
    role: string;
    voice_actors?: {
      person: {
        mal_id: number;
        name: string;
        images: { jpg: { image_url: string } };
      };
      language: string;
    }[];
  }[];
}

export const jikanCharactersTool: ToolDefinition = {
  name: "jikanCharacters",
  description:
    "Lấy danh sách nhân vật và diễn viên lồng tiếng (seiyuu) của một anime hoặc manga.",
  parameters: [
    {
      name: "id",
      type: "number",
      description: "MAL ID của anime/manga",
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
      description: "Số nhân vật tối đa trả về (mặc định: 10)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    try {
      if (!params.id) {
        return { success: false, error: "Thiếu ID anime/manga" };
      }

      const mediaType = params.mediaType || "anime";
      const endpoint = `/${mediaType}/${params.id}/characters`;
      const limit = params.limit || 10;

      const response = await jikanFetch<CharacterResponse>(endpoint);

      const characters = response.data.slice(0, limit).map((item) => ({
        id: item.character.mal_id,
        name: item.character.name,
        role: item.role,
        image:
          item.character.images?.webp?.image_url ||
          item.character.images?.jpg?.image_url,
        url: item.character.url,
        voiceActors: item.voice_actors
          ?.filter((va) => va.language === "Japanese")
          .slice(0, 2)
          .map((va) => ({
            id: va.person.mal_id,
            name: va.person.name,
            image: va.person.images?.jpg?.image_url,
          })),
      }));

      return {
        success: true,
        data: {
          animeId: params.id,
          totalCharacters: response.data.length,
          characters,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy nhân vật: ${error.message}` };
    }
  },
};

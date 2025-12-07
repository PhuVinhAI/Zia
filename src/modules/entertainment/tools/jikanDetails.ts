/**
 * Tool: jikanDetails - Lấy thông tin chi tiết Anime/Manga
 */

import { JikanDetailsSchema, validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import {
  type JikanAnime,
  type JikanManga,
  type JikanSingleResponse,
  jikanFetch,
} from '../services/jikanClient.js';

export const jikanDetailsTool: ToolDefinition = {
  name: 'jikanDetails',
  description:
    'Lấy thông tin chi tiết đầy đủ của một anime hoặc manga theo MAL ID. Bao gồm synopsis, điểm số, thể loại, studio, v.v.',
  parameters: [
    {
      name: 'id',
      type: 'number',
      description: 'MAL ID của anime/manga',
      required: true,
    },
    {
      name: 'mediaType',
      type: 'string',
      description: "Loại: 'anime' hoặc 'manga' (mặc định: anime)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(JikanDetailsSchema, params, 'jikanDetails');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const endpoint = `/${data.mediaType}/${data.id}/full`;

      const response = await jikanFetch<JikanSingleResponse<JikanAnime | JikanManga>>(endpoint);
      const item = response.data;

      const baseData = {
        id: item.mal_id,
        url: item.url,
        title: item.title,
        titleEnglish: item.title_english,
        titleJapanese: item.title_japanese,
        type: item.type,
        status: item.status,
        score: item.score,
        scoredBy: item.scored_by,
        rank: item.rank,
        popularity: item.popularity,
        members: item.members,
        favorites: item.favorites,
        synopsis: item.synopsis,
        genres: item.genres?.map((g) => ({ id: g.mal_id, name: g.name })),
        image: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
      };

      if (data.mediaType === 'anime') {
        const anime = item as JikanAnime;
        return {
          success: true,
          data: {
            ...baseData,
            episodes: anime.episodes,
            season: anime.season,
            year: anime.year,
            source: anime.source,
            duration: anime.duration,
            rating: anime.rating,
            studios: anime.studios?.map((s) => s.name),
            broadcast: anime.broadcast?.string,
          },
        };
      } else {
        const manga = item as JikanManga;
        return {
          success: true,
          data: {
            ...baseData,
            chapters: manga.chapters,
            volumes: manga.volumes,
            authors: manga.authors?.map((a) => a.name),
          },
        };
      }
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy chi tiết: ${error.message}` };
    }
  },
};

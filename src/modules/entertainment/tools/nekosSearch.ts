/**
 * Tool: nekosSearch - Tìm kiếm ảnh anime từ Nekos API
 */

import { NekosSearchSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { type NekosImage, nekosFetch } from '../services/nekosClient.js';

interface NekosSearchResponse {
  items: NekosImage[];
  count: number;
}

export const nekosSearchTool: ToolDefinition = {
  name: 'nekosSearch',
  description:
    'Tìm kiếm ảnh anime từ Nekos API với pagination. Hỗ trợ lọc theo tags, rating, artist.',
  parameters: [
    {
      name: 'tags',
      type: 'string',
      description:
        'Tags để lọc ảnh, cách nhau bởi dấu phẩy (VD: catgirl,cute). Tags phổ biến: catgirl, foxgirl, kemonomimi, maid, uniform, swimsuit, kimono',
      required: false,
    },
    {
      name: 'withoutTags',
      type: 'string',
      description: 'Tags cần loại trừ, cách nhau bởi dấu phẩy',
      required: false,
    },
    {
      name: 'rating',
      type: 'string',
      description: "Độ tuổi: 'safe', 'suggestive'. Mặc định: safe",
      required: false,
    },
    {
      name: 'artist',
      type: 'number',
      description: 'ID của artist để lọc ảnh theo tác giả',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Số lượng ảnh mỗi trang (1-100, mặc định: 10)',
      required: false,
    },
    {
      name: 'offset',
      type: 'number',
      description: 'Số ảnh bỏ qua để phân trang (mặc định: 0)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParams(NekosSearchSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const queryParams: Record<string, any> = {
        rating: data.rating,
        artist: data.artist,
        tags: data.tags,
        without_tags: data.withoutTags,
        limit: data.limit,
        offset: data.offset,
      };

      const response = await nekosFetch<NekosSearchResponse>('/images', queryParams);

      const images = response.items.map((img: NekosImage) => ({
        id: img.id,
        url: img.image_url || img.url,
        sampleUrl: img.sample_url,
        width: img.image_width,
        height: img.image_height,
        rating: img.rating,
        source: img.source,
        artist: img.artist?.name || (img as any).artist_name || null,
        tags: Array.isArray(img.tags)
          ? img.tags.map((t: any) => (typeof t === 'string' ? t : t.name))
          : [],
      }));

      return {
        success: true,
        data: {
          images,
          count: images.length,
          total: response.count,
          pagination: {
            limit: data.limit,
            offset: data.offset,
            hasMore: data.offset + images.length < response.count,
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tìm kiếm Nekos: ${error.message}` };
    }
  },
};

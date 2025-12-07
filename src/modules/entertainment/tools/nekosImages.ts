/**
 * Tool: nekosImages - Lấy ảnh anime từ Nekos API
 * Sử dụng cơ chế Download Buffer -> Send Buffer để tránh bị chặn 403
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  NekosImagesSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { fetchImageAsBuffer } from '../../../shared/utils/httpClient.js';
import { type NekosImage, nekosFetch } from '../services/nekosClient.js';

export const nekosImagesTool: ToolDefinition = {
  name: 'nekosImages',
  description:
    'Lấy ảnh anime ngẫu nhiên từ Nekos API. Hỗ trợ lọc theo tags, rating, artist. Trả về ảnh trực tiếp.',
  parameters: [
    {
      name: 'tags',
      type: 'string',
      description:
        'Tags để lọc ảnh, cách nhau bởi dấu phẩy (VD: catgirl,cute). Một số tags phổ biến: catgirl, foxgirl, kemonomimi, maid, uniform, swimsuit, kimono',
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
      description:
        "Độ tuổi phù hợp: 'safe' (an toàn), 'suggestive' (gợi cảm nhẹ), 'borderline' (ranh giới), 'explicit' (18+). Mặc định: safe",
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
      description: 'Số lượng ảnh trả về (1-25, mặc định: 1)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(NekosImagesSchema, params, 'nekosImages');
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
      };

      const response = await nekosFetch<NekosImage[]>('/images/random', queryParams);

      if (!response || response.length === 0) {
        return { success: false, error: 'Không tìm thấy ảnh phù hợp' };
      }

      // Download tất cả ảnh về buffer để tránh bị chặn 403
      const imageBuffers: Array<{
        buffer: Buffer;
        mimeType: string;
        info: {
          id: number;
          width?: number;
          height?: number;
          rating: string;
          source?: string | null;
          artist?: string | null;
          tags: string[];
        };
      }> = [];

      for (const img of response) {
        const imageUrl = img.image_url || img.url || img.sample_url;
        if (!imageUrl) continue;

        debugLog('NEKOS', `Downloading image: ${imageUrl.substring(0, 60)}...`);
        const result = await fetchImageAsBuffer(imageUrl);

        if (result) {
          imageBuffers.push({
            buffer: result.buffer,
            mimeType: result.mimeType,
            info: {
              id: img.id,
              width: img.image_width,
              height: img.image_height,
              rating: img.rating,
              source: img.source,
              artist: img.artist?.name || (img as any).artist_name || null,
              tags: Array.isArray(img.tags)
                ? img.tags.map((t: any) => (typeof t === 'string' ? t : t.name))
                : [],
            },
          });
        } else {
          debugLog('NEKOS', `Failed to download image: ${imageUrl}`);
        }
      }

      if (imageBuffers.length === 0) {
        return { success: false, error: 'Không thể tải ảnh từ nguồn (có thể bị chặn)' };
      }

      return {
        success: true,
        data: {
          imageBuffers, // Array of { buffer, mimeType, info }
          count: imageBuffers.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi lấy ảnh Nekos: ${error.message}` };
    }
  },
};

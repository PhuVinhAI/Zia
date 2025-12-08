/**
 * Tool: giphyGif - Tìm và gửi GIF từ Giphy
 * Hỗ trợ search, trending, random
 */

import { debugLog } from '../../../core/logger/logger.js';
import { GiphyGifSchema, validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { fetchImageAsBuffer } from '../../../shared/utils/httpClient.js';
import {
  type GiphyGif,
  getRandomGif,
  getTrendingGifs,
  searchGifs,
} from '../services/giphyClient.js';

export const giphyGifTool: ToolDefinition = {
  name: 'giphyGif',
  description:
    'Tìm và gửi GIF từ Giphy. Hỗ trợ tìm kiếm theo từ khóa, lấy GIF trending, hoặc GIF ngẫu nhiên.',
  parameters: [
    {
      name: 'mode',
      type: 'string',
      description:
        "Chế độ: 'search' (tìm kiếm), 'trending' (xu hướng), 'random' (ngẫu nhiên). Mặc định: search",
      required: false,
    },
    {
      name: 'query',
      type: 'string',
      description: 'Từ khóa tìm kiếm GIF (bắt buộc với mode search, tùy chọn với random làm tag)',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Số lượng GIF trả về (1-25, mặc định: 1). Không áp dụng cho mode random',
      required: false,
    },
    {
      name: 'rating',
      type: 'string',
      description:
        "Độ tuổi: 'y' (trẻ em), 'g' (mọi lứa tuổi), 'pg' (cần hướng dẫn), 'pg-13' (13+), 'r' (17+). Mặc định: r",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(GiphyGifSchema, params, 'giphyGif');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      let gifs: GiphyGif[] = [];

      switch (data.mode) {
        case 'trending': {
          const response = await getTrendingGifs({
            limit: data.limit,
            rating: data.rating,
          });
          gifs = response.data;
          break;
        }
        case 'random': {
          const response = await getRandomGif({
            tag: data.query,
            rating: data.rating,
          });
          if (response.data) {
            gifs = [response.data];
          }
          break;
        }
        default: {
          if (!data.query) {
            return { success: false, error: 'Cần từ khóa tìm kiếm cho mode search' };
          }
          const response = await searchGifs(data.query, {
            limit: data.limit,
            rating: data.rating,
          });
          gifs = response.data;
          break;
        }
      }

      if (!gifs || gifs.length === 0) {
        return { success: false, error: 'Không tìm thấy GIF phù hợp' };
      }

      // Download GIFs về buffer
      const gifBuffers: Array<{
        buffer: Buffer;
        mimeType: string;
        info: {
          id: string;
          title: string;
          url: string;
          rating: string;
        };
      }> = [];

      for (const gif of gifs) {
        // Ưu tiên downsized để tối ưu kích thước
        const gifUrl =
          gif.images.downsized?.url || gif.images.fixed_height?.url || gif.images.original?.url;

        if (!gifUrl) continue;

        debugLog('GIPHY', `Downloading GIF: ${gif.title || gif.id}`);
        const result = await fetchImageAsBuffer(gifUrl);

        if (result) {
          gifBuffers.push({
            buffer: result.buffer,
            mimeType: 'image/gif',
            info: {
              id: gif.id,
              title: gif.title || 'Untitled',
              url: gif.url,
              rating: gif.rating,
            },
          });
        } else {
          debugLog('GIPHY', `Failed to download GIF: ${gifUrl}`);
        }
      }

      if (gifBuffers.length === 0) {
        return { success: false, error: 'Không thể tải GIF từ nguồn' };
      }

      return {
        success: true,
        data: {
          imageBuffers: gifBuffers,
          count: gifBuffers.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi Giphy API: ${error.message}` };
    }
  },
};

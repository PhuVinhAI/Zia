/**
 * Tool: freepikImage - Tạo ảnh AI với Freepik Seedream v4
 * Sử dụng cơ chế Download Buffer -> Send Buffer để tránh bị chặn 403
 */

import { debugLog } from '../../../core/logger/logger.js';
import { FreepikImageSchema, validateParamsWithExample } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { fetchImageAsBuffer } from '../../../shared/utils/httpClient.js';
import { generateSeedreamImage, pollTaskUntilComplete } from '../services/freepikClient.js';

export const freepikImageTool: ToolDefinition = {
  name: 'freepikImage',
  description: `Tạo ảnh AI với Freepik Seedream v4. Chất lượng cao, hỗ trợ nhiều aspect ratio.
Trả về ảnh trực tiếp. Thời gian tạo ~10-30 giây.`,
  parameters: [
    {
      name: 'prompt',
      type: 'string',
      description:
        'Mô tả chi tiết ảnh cần tạo bằng tiếng Anh. VD: "A cute anime girl with cat ears in a garden"',
      required: true,
    },
    {
      name: 'aspectRatio',
      type: 'string',
      description:
        "Tỷ lệ khung hình: 'square_1_1' (vuông), 'widescreen_16_9' (ngang), 'social_story_9_16' (dọc story), 'portrait_2_3', 'traditional_3_4'. Mặc định: square_1_1",
      required: false,
    },
    {
      name: 'guidanceScale',
      type: 'number',
      description: 'Độ tuân thủ prompt (0-20). Cao hơn = sát prompt hơn. Mặc định: 2.5',
      required: false,
    },
    {
      name: 'seed',
      type: 'number',
      description: 'Seed để tái tạo kết quả (0-2147483647). Bỏ trống = ngẫu nhiên',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(FreepikImageSchema, params, 'freepikImage');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      const response = await generateSeedreamImage({
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        guidanceScale: data.guidanceScale,
        seed: data.seed,
      });

      const taskId = response.data.task_id;

      // Poll cho đến khi hoàn thành
      const result = await pollTaskUntilComplete(taskId, 30, 2000);

      if (result.data.status === 'FAILED') {
        return {
          success: false,
          error: `Tạo ảnh thất bại: ${result.data.error || 'Unknown error'}`,
        };
      }

      const imageUrls = result.data.generated || [];
      if (imageUrls.length === 0) {
        return { success: false, error: 'Không có ảnh được tạo' };
      }

      // Download ảnh ngay lập tức để tránh URL hết hạn hoặc bị chặn 403
      const imageBuffers: Array<{
        buffer: Buffer;
        mimeType: string;
      }> = [];

      for (const url of imageUrls) {
        debugLog('FREEPIK', `Downloading generated image: ${url.substring(0, 60)}...`);
        const downloaded = await fetchImageAsBuffer(url);

        if (downloaded) {
          imageBuffers.push({
            buffer: downloaded.buffer,
            mimeType: downloaded.mimeType,
          });
        } else {
          debugLog('FREEPIK', `Failed to download image: ${url}`);
        }
      }

      if (imageBuffers.length === 0) {
        return { success: false, error: 'Không thể tải ảnh đã tạo (URL có thể đã hết hạn)' };
      }

      return {
        success: true,
        data: {
          imageBuffers, // Array of { buffer, mimeType }
          prompt: data.prompt,
          taskId,
          count: imageBuffers.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi Freepik: ${error.message}` };
    }
  },
};

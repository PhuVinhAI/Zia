/**
 * Tool: freepikImage - Tạo ảnh AI với Freepik Seedream v4
 */

import { FreepikImageSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { generateSeedreamImage, pollTaskUntilComplete } from '../services/freepikClient.js';

export const freepikImageTool: ToolDefinition = {
  name: 'freepikImage',
  description: `Tạo ảnh AI với Freepik Seedream v4. Chất lượng cao, hỗ trợ nhiều aspect ratio.
Trả về URL ảnh đã tạo. Thời gian tạo ~10-30 giây.`,
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
    const validation = validateParams(FreepikImageSchema, params);
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

      const images = result.data.generated || [];
      if (images.length === 0) {
        return { success: false, error: 'Không có ảnh được tạo' };
      }

      return {
        success: true,
        data: {
          images,
          prompt: data.prompt,
          taskId,
          count: images.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi Freepik: ${error.message}` };
    }
  },
};

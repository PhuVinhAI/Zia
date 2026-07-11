/**
 * Tool: imagen - Tạo ảnh AI với Google Imagen (native @google/genai)
 * Sử dụng ImagenKeyManager để rotate keys + models (mirror Gemini pattern).
 *
 * @google/genai docs: https://ai.google.dev/gemini-api/docs/image-generation
 */

import { debugLog } from '../../../core/logger/logger.js';
import { generateImagenImages } from '../../../infrastructure/ai/providers/imagen/imagenClient.js';
import {
  ImagenImageSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

export const imagenTool: ToolDefinition = {
  name: 'imagen',
  description: `Tạo ảnh AI với Google Imagen 4.0 (qua @google/genai). Hỗ trợ nhiều aspect ratio, 1-4 ảnh / lần, auto rotate key + model khi rate-limit. Thời gian tạo ~5-15 giây.`,
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
        "Tỷ lệ khung hình: '1:1' (vuông - mặc định), '3:4' (portrait), '4:3' (landscape), '9:16' (story dọc), '16:9' (widescreen)",
      required: false,
    },
    {
      name: 'numberOfImages',
      type: 'number',
      description: 'Số ảnh cần tạo (1-4). Mặc định: 1',
      required: false,
    },
    {
      name: 'personGeneration',
      type: 'string',
      description:
        "Cho phép tạo ảnh người: 'allow_adult' (mặc định), 'dont_allow' (chặn), 'allow_all' (cả trẻ em)",
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(ImagenImageSchema, params, 'imagen');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      debugLog(
        'IMAGEN',
        `Tool call: prompt="${data.prompt.slice(0, 60)}...", aspect=${data.aspectRatio}, count=${data.numberOfImages}`,
      );

      const result = await generateImagenImages({
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        numberOfImages: data.numberOfImages,
        personGeneration: data.personGeneration,
      });

      if (result.imageBuffers.length === 0) {
        return { success: false, error: 'Imagen không trả về ảnh nào' };
      }

      return {
        success: true,
        data: {
          imageBuffers: result.imageBuffers,
          prompt: result.prompt,
          model: result.model,
          count: result.count,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi Imagen: ${error.message}` };
    }
  },
};

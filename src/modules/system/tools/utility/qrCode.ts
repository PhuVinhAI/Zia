/**
 * Tool: qrCode - Tạo mã QR từ text hoặc URL
 * Sử dụng goqr.me API (miễn phí, không cần API key)
 */

import { debugLog } from '../../../../core/logger/logger.js';
import {
  QRCodeSchema,
  validateParamsWithExample,
} from '../../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../../shared/types/tools.types.js';
import { generateQRCode } from '../../services/utilityClient.js';

export const qrCodeTool: ToolDefinition = {
  name: 'qrCode',
  description:
    'Tạo mã QR từ text, URL, số điện thoại, hoặc bất kỳ nội dung nào. Trả về hình ảnh QR code.',
  parameters: [
    {
      name: 'data',
      type: 'string',
      description: 'Nội dung cần tạo QR (text, URL, số điện thoại)',
      required: true,
    },
    {
      name: 'size',
      type: 'number',
      description: 'Kích thước QR (100-1000 pixels, mặc định 300)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(QRCodeSchema, params, 'qrCode');
    if (!validation.success) return { success: false, error: validation.error };
    const { data, size } = validation.data;

    try {
      const result = await generateQRCode({ data, size });

      if (!result) {
        return { success: false, error: 'Không thể tạo mã QR. Vui lòng thử lại.' };
      }

      debugLog('QR_TOOL', `Generated QR for: ${data.substring(0, 30)}...`);

      return {
        success: true,
        data: {
          content: data,
          size: result.size,
          imageUrl: result.url,
          // Trả về buffer để gửi ảnh (giống freepikImage pattern)
          imageBuffers: [
            {
              buffer: result.buffer,
              mimeType: result.mimeType,
            },
          ],
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi tạo QR: ${error.message}` };
    }
  },
};

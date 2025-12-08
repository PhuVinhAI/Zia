/**
 * Tool: urlShortener - Rút gọn URL
 * Sử dụng is.gd API (miễn phí, không cần API key)
 */

import { debugLog } from '../../../../core/logger/logger.js';
import {
  UrlShortenerSchema,
  validateParamsWithExample,
} from '../../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../../shared/types/tools.types.js';
import { shortenUrl, shortenUrlWithAlias } from '../../services/utilityClient.js';

export const urlShortenerTool: ToolDefinition = {
  name: 'urlShortener',
  description: 'Rút gọn URL dài thành link ngắn gọn. Có thể tùy chỉnh tên link.',
  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'URL cần rút gọn (phải là URL hợp lệ)',
      required: true,
    },
    {
      name: 'alias',
      type: 'string',
      description: 'Tên tùy chỉnh cho link (3-30 ký tự, tùy chọn)',
      required: false,
    },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(UrlShortenerSchema, params, 'urlShortener');
    if (!validation.success) return { success: false, error: validation.error };
    const { url, alias } = validation.data;

    try {
      const result = alias ? await shortenUrlWithAlias(url, alias) : await shortenUrl(url);

      if (!result) {
        return {
          success: false,
          error: alias
            ? `Không thể rút gọn URL với alias "${alias}". Alias có thể đã được sử dụng.`
            : 'Không thể rút gọn URL. Vui lòng kiểm tra URL hợp lệ.',
        };
      }

      debugLog('URL_TOOL', `Shortened: ${url} → ${result.shortUrl}`);

      return {
        success: true,
        data: {
          originalUrl: result.originalUrl,
          shortUrl: result.shortUrl,
          message: `✅ Link rút gọn: ${result.shortUrl}`,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi rút gọn URL: ${error.message}` };
    }
  },
};

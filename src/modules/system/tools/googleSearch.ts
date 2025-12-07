/**
 * Tool: googleSearch - Tìm kiếm web bằng Google Custom Search API
 */

import { debugLog } from '../../../core/logger/logger.js';
import {
  GoogleSearchSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { googleSearch } from '../services/googleSearchClient.js';

export const googleSearchTool: ToolDefinition = {
  name: 'googleSearch',
  description: 'Tìm kiếm thông tin trên web bằng Google. Trả về tiêu đề, link, mô tả.',
  parameters: [
    { name: 'q', type: 'string', description: 'Từ khóa tìm kiếm', required: true },
    { name: 'num', type: 'number', description: 'Số kết quả (1-10)', required: false },
    { name: 'start', type: 'number', description: 'Vị trí bắt đầu (phân trang)', required: false },
    { name: 'searchType', type: 'string', description: 'Loại: web hoặc image', required: false },
    { name: 'safe', type: 'string', description: 'Safe search: off hoặc active', required: false },
  ],
  execute: async (params): Promise<ToolResult> => {
    const validation = validateParamsWithExample(GoogleSearchSchema, params, 'googleSearch');
    if (!validation.success) return { success: false, error: validation.error };
    const data = validation.data;

    try {
      const result = await googleSearch({
        q: data.q,
        num: data.num,
        start: data.start,
        searchType: data.searchType,
        safe: data.safe,
      });

      const items = result.items.map((item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src || item.pagemap?.cse_image?.[0]?.src,
      }));

      debugLog('GOOGLE_SEARCH', `Found ${items.length} results for "${data.q}"`);

      return {
        success: true,
        data: {
          query: data.q,
          totalResults: result.totalResults,
          searchTime: result.searchTime,
          items,
          nextStartIndex: result.nextStartIndex,
        },
      };
    } catch (error: any) {
      return { success: false, error: `Lỗi Google Search: ${error.message}` };
    }
  },
};

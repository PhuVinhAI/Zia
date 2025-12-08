/**
 * Tool: getFriendOnlines - Lấy danh sách bạn bè đang online
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import {
  GetFriendOnlinesSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

export const getFriendOnlinesTool: ToolDefinition = {
  name: 'getFriendOnlines',
  description:
    'Lấy danh sách bạn bè đang online (có chấm xanh). Trả về userId và trạng thái. Lưu ý: Chỉ thấy người công khai trạng thái online.',
  parameters: [
    {
      name: 'limit',
      type: 'number',
      description: 'Giới hạn số lượng trả về (mặc định: 10, tối đa: 50)',
      required: false,
      default: 10,
    },
    {
      name: 'includeNames',
      type: 'boolean',
      description: 'Có lấy tên hiển thị không (chậm hơn vì phải gọi thêm API)',
      required: false,
      default: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(
      GetFriendOnlinesSchema,
      params,
      'getFriendOnlines',
    );
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      debugLog(
        'TOOL:getFriendOnlines',
        `Calling API with limit=${data.limit}, includeNames=${data.includeNames}`,
      );

      let result: any;
      try {
        result = await context.api.getFriendOnlines();
      } catch (apiError: any) {
        debugLog('TOOL:getFriendOnlines', `API error: ${apiError.message}`);
        if (apiError.message?.includes('JSON') || apiError.message?.includes('Unexpected')) {
          return {
            success: true,
            data: {
              total: 0,
              message: 'Không có ai đang online hoặc API tạm thời không khả dụng',
              friends: [],
            },
          };
        }
        throw apiError;
      }

      logZaloAPI(
        'tool:getFriendOnlines',
        { limit: data.limit, includeNames: data.includeNames },
        { count: result?.onlines?.length, sample: result?.onlines?.slice(0, 3) },
      );

      debugLog(
        'TOOL:getFriendOnlines',
        `Raw response type: ${typeof result}, onlines count: ${result?.onlines?.length}`,
      );

      if (!result || !result.onlines || !Array.isArray(result.onlines)) {
        debugLog(
          'TOOL:getFriendOnlines',
          `Invalid/empty response: ${JSON.stringify(result)?.substring(0, 500)}`,
        );
        return {
          success: true,
          data: {
            total: 0,
            message: 'Không có ai đang online (hoặc họ ẩn trạng thái)',
            friends: [],
          },
        };
      }

      const onlineList = result.onlines.slice(0, data.limit);

      if (onlineList.length === 0) {
        return {
          success: true,
          data: {
            total: 0,
            message: 'Không có ai đang online (hoặc họ ẩn trạng thái)',
            friends: [],
          },
        };
      }

      const friends: any[] = [];
      for (const user of onlineList) {
        const friendData: any = { userId: user.userId };

        if (data.includeNames) {
          try {
            const info = await context.api.getUserInfo(user.userId);
            const profile = info?.changed_profiles?.[user.userId];
            friendData.displayName = profile?.displayName || profile?.zaloName || 'Không tên';
          } catch {
            friendData.displayName = 'Không lấy được tên';
          }
        }

        friends.push(friendData);
      }

      return {
        success: true,
        data: {
          total: result.onlines.length,
          returned: friends.length,
          friends,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy danh sách online: ${error.message}`,
      };
    }
  },
};

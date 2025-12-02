/**
 * Tool: getFriendOnlines - Lấy danh sách bạn bè đang online
 */
import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import { debugLog, logZaloAPI } from "../utils/logger.js";

export const getFriendOnlinesTool: ToolDefinition = {
  name: "getFriendOnlines",
  description:
    "Lấy danh sách bạn bè đang online (có chấm xanh). Trả về userId và trạng thái. Lưu ý: Chỉ thấy người công khai trạng thái online.",
  parameters: [
    {
      name: "limit",
      type: "number",
      description: "Giới hạn số lượng trả về (mặc định: 10, tối đa: 50)",
      required: false,
      default: 10,
    },
    {
      name: "includeNames",
      type: "boolean",
      description: "Có lấy tên hiển thị không (chậm hơn vì phải gọi thêm API)",
      required: false,
      default: true,
    },
  ],
  execute: async (
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      const limit = Math.min(params.limit || 10, 50);
      const includeNames = params.includeNames !== false;

      debugLog(
        "TOOL:getFriendOnlines",
        `Calling API with limit=${limit}, includeNames=${includeNames}`
      );

      let result: any;
      try {
        result = await context.api.getFriendOnlines();
      } catch (apiError: any) {
        // API có thể throw error khi không có ai online hoặc response rỗng
        debugLog("TOOL:getFriendOnlines", `API error: ${apiError.message}`);

        // Nếu lỗi JSON parse, có thể không có ai online
        if (
          apiError.message?.includes("JSON") ||
          apiError.message?.includes("Unexpected")
        ) {
          return {
            success: true,
            data: {
              total: 0,
              message:
                "Không có ai đang online hoặc API tạm thời không khả dụng",
              friends: [],
            },
          };
        }
        throw apiError;
      }

      logZaloAPI(
        "tool:getFriendOnlines",
        { limit, includeNames },
        { count: result?.onlines?.length, sample: result?.onlines?.slice(0, 3) }
      );

      debugLog(
        "TOOL:getFriendOnlines",
        `Raw response type: ${typeof result}, onlines count: ${
          result?.onlines?.length
        }`
      );

      // Handle trường hợp result null/undefined hoặc onlines rỗng
      if (!result || !result.onlines || !Array.isArray(result.onlines)) {
        debugLog(
          "TOOL:getFriendOnlines",
          `Invalid/empty response: ${JSON.stringify(result)?.substring(0, 500)}`
        );
        return {
          success: true,
          data: {
            total: 0,
            message: "Không có ai đang online (hoặc họ ẩn trạng thái)",
            friends: [],
          },
        };
      }

      const onlineList = result.onlines.slice(0, limit);

      if (onlineList.length === 0) {
        return {
          success: true,
          data: {
            total: 0,
            message: "Không có ai đang online (hoặc họ ẩn trạng thái)",
            friends: [],
          },
        };
      }

      // Format danh sách
      const friends: any[] = [];
      for (const user of onlineList) {
        const friendData: any = {
          userId: user.userId,
        };

        // Lấy tên nếu cần
        if (includeNames) {
          try {
            const info = await context.api.getUserInfo(user.userId);
            const profile = info?.changed_profiles?.[user.userId];
            friendData.displayName =
              profile?.displayName || profile?.zaloName || "Không tên";
          } catch {
            friendData.displayName = "Không lấy được tên";
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

/**
 * Tool: getAllFriends - Lấy danh sách tất cả bạn bè
 */
import {
  ToolDefinition,
  ToolContext,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { debugLog, logZaloAPI } from "../../../core/logger/logger.js";

export const getAllFriendsTool: ToolDefinition = {
  name: "getAllFriends",
  description:
    "Lấy danh sách tất cả bạn bè của bot. Trả về danh sách gồm tên và userId của từng người. Lưu ý: API này nặng, chỉ nên gọi khi thực sự cần.",
  parameters: [
    {
      name: "limit",
      type: "number",
      description:
        "Giới hạn số lượng bạn bè trả về (mặc định: 50, tối đa: 200)",
      required: false,
      default: 50,
    },
  ],
  execute: async (
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      const limit = Math.min(params.limit || 50, 200);

      debugLog("TOOL:getAllFriends", `Calling API with limit=${limit}`);
      const friends = await context.api.getAllFriends();
      logZaloAPI(
        "tool:getAllFriends",
        { limit },
        { count: friends?.length, sample: friends?.slice(0, 3) }
      );
      debugLog(
        "TOOL:getAllFriends",
        `Raw response type: ${typeof friends}, isArray: ${Array.isArray(
          friends
        )}, length: ${friends?.length}`
      );

      if (!friends || !Array.isArray(friends)) {
        debugLog(
          "TOOL:getAllFriends",
          `Invalid response: ${JSON.stringify(friends)?.substring(0, 500)}`
        );
        return { success: false, error: "Không lấy được danh sách bạn bè" };
      }

      // Giới hạn và format danh sách
      const limitedFriends = friends.slice(0, limit).map((friend: any) => ({
        userId: friend.userId,
        displayName: friend.displayName || friend.zaloName || "Không tên",
        gender:
          friend.gender === 0
            ? "Nam"
            : friend.gender === 1
            ? "Nữ"
            : "Không xác định",
      }));

      return {
        success: true,
        data: {
          total: friends.length,
          returned: limitedFriends.length,
          friends: limitedFriends,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi lấy danh sách bạn bè: ${error.message}`,
      };
    }
  },
};

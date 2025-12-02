/**
 * Tool: sendCard - Gửi danh thiếp (contact card) của một người
 */
import { ToolDefinition, ToolContext, ToolResult } from "./types.js";
import { ThreadType } from "../services/zalo.js";
import { debugLog, logZaloAPI } from "../utils/logger.js";

export const sendCardTool: ToolDefinition = {
  name: "sendCard",
  description:
    "Gửi danh thiếp (contact card) của một người dùng Zalo. Người nhận có thể bấm vào để kết bạn hoặc nhắn tin.",
  parameters: [
    {
      name: "userId",
      type: "string",
      description:
        "ID của người muốn gửi danh thiếp. Nếu không có, sẽ gửi danh thiếp của bot.",
      required: false,
    },
    {
      name: "phoneNumber",
      type: "string",
      description: "Số điện thoại hiển thị trên card (tùy chọn)",
      required: false,
    },
    {
      name: "message",
      type: "string",
      description: "Tin nhắn kèm theo trước khi gửi card (tùy chọn)",
      required: false,
    },
  ],
  execute: async (
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Lấy userId, mặc định là bot's ID
      let targetUserId = params.userId;
      if (!targetUserId) {
        targetUserId = context.api.getContext().uid;
      }

      // Đảm bảo userId luôn là string (API Zalo yêu cầu string)
      targetUserId = String(targetUserId);

      debugLog(
        "TOOL:sendCard",
        `Sending card for userId=${targetUserId}, threadId=${context.threadId}`
      );

      // Gửi tin nhắn kèm theo nếu có
      if (params.message) {
        const msgResult = await context.api.sendMessage(
          params.message,
          context.threadId,
          ThreadType.User
        );
        logZaloAPI(
          "tool:sendCard:message",
          { message: params.message, threadId: context.threadId },
          msgResult
        );
      }

      // Tạo card data
      const cardData: any = {
        userId: targetUserId,
      };
      if (params.phoneNumber) {
        cardData.phoneNumber = params.phoneNumber;
      }

      // Gửi card
      debugLog("TOOL:sendCard", `Card data: ${JSON.stringify(cardData)}`);
      const cardResult = await context.api.sendCard(
        cardData,
        context.threadId,
        ThreadType.User
      );
      logZaloAPI(
        "tool:sendCard",
        { cardData, threadId: context.threadId },
        cardResult
      );
      debugLog("TOOL:sendCard", `Raw response: ${JSON.stringify(cardResult)}`);

      // Lấy thông tin người được gửi card để trả về
      let displayName = "Không xác định";
      try {
        const info = await context.api.getUserInfo(targetUserId);
        const profile = info?.changed_profiles?.[targetUserId];
        displayName = profile?.displayName || profile?.zaloName || targetUserId;
      } catch {
        // Ignore
      }

      return {
        success: true,
        data: {
          message: `Đã gửi danh thiếp của "${displayName}"`,
          userId: targetUserId,
          displayName,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi gửi danh thiếp: ${error.message}`,
      };
    }
  },
};

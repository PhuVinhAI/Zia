/**
 * Tool: sendLink - Gửi Link có Rich Preview (ảnh bìa, tiêu đề, mô tả)
 *
 * Thay vì gửi link text thường, tool này gửi link với preview đẹp
 * giống khi share link báo, YouTube, Google Maps...
 */
import {
  ToolDefinition,
  ToolContext,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { ThreadType } from "../../../infrastructure/zalo/zalo.service.js";
import { debugLog, logZaloAPI } from "../../../core/logger/logger.js";

export const sendLinkTool: ToolDefinition = {
  name: "sendLink",
  description:
    "Gửi link có Rich Preview (ảnh bìa, tiêu đề, mô tả). Dùng để gửi link YouTube, báo, Google Maps... nhìn chuyên nghiệp hơn link text thường.",
  parameters: [
    {
      name: "link",
      type: "string",
      description: "URL cần gửi (ví dụ: https://youtube.com/watch?v=xxx)",
      required: true,
    },
    {
      name: "message",
      type: "string",
      description: "Lời dẫn/caption kèm theo link (tùy chọn)",
      required: false,
    },
  ],
  execute: async (
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> => {
    try {
      const { link, message } = params;

      if (!link) {
        return {
          success: false,
          error: "Thiếu tham số 'link' (URL cần gửi)",
        };
      }

      // Validate URL
      try {
        new URL(link);
      } catch {
        return {
          success: false,
          error: `URL không hợp lệ: ${link}`,
        };
      }

      debugLog(
        "TOOL:sendLink",
        `Sending link: ${link}, message: ${message || "(none)"}, threadId=${
          context.threadId
        }`
      );

      // Tạo link data
      const linkData: any = {
        link: link,
      };

      if (message) {
        linkData.msg = message;
      }

      // Gửi link với rich preview
      const result = await context.api.sendLink(
        linkData,
        context.threadId,
        ThreadType.User
      );

      logZaloAPI(
        "tool:sendLink",
        { linkData, threadId: context.threadId },
        result
      );

      debugLog("TOOL:sendLink", `Raw response: ${JSON.stringify(result)}`);

      return {
        success: true,
        data: {
          message: `Đã gửi link với rich preview`,
          link: link,
          caption: message || null,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Lỗi gửi link: ${error.message}`,
      };
    }
  },
};

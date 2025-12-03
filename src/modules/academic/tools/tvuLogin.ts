/**
 * Tool: tvuLogin - Đăng nhập TVU Student Portal
 */
import {
  ToolDefinition,
  ToolResult,
} from "../../../shared/types/tools.types.js";
import { tvuLogin, setTvuToken } from "../services/tvuClient.js";
import { debugLog } from "../../../core/logger/logger.js";

export const tvuLoginTool: ToolDefinition = {
  name: "tvuLogin",
  description:
    "Đăng nhập vào cổng thông tin sinh viên TVU (Đại học Trà Vinh). Cần mã số sinh viên và mật khẩu.",
  parameters: [
    {
      name: "username",
      type: "string",
      description: "Mã số sinh viên TVU",
      required: true,
    },
    {
      name: "password",
      type: "string",
      description: "Mật khẩu đăng nhập",
      required: true,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    try {
      const { username, password } = params;

      if (!username || !password) {
        return {
          success: false,
          error: "Thiếu mã số sinh viên hoặc mật khẩu",
        };
      }

      debugLog("TVU:Login", `Attempting login for ${username}`);
      const result = await tvuLogin(username, password);

      return {
        success: true,
        data: {
          message: "Đăng nhập thành công!",
          userId: result.user_id,
          userName: result.user_name,
          tokenType: result.token_type,
          expiresIn: result.expires_in,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Đăng nhập thất bại: ${error.message}`,
      };
    }
  },
};

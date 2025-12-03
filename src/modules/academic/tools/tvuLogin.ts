/**
 * Tool: tvuLogin - Đăng nhập TVU Student Portal
 */

import { debugLog } from '../../../core/logger/logger.js';
import { TvuLoginSchema, validateParams } from '../../../shared/schemas/tools.schema.js';
import type { ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';
import { tvuLogin } from '../services/tvuClient.js';

export const tvuLoginTool: ToolDefinition = {
  name: 'tvuLogin',
  description:
    'Đăng nhập vào cổng thông tin sinh viên TVU (Đại học Trà Vinh). Cần mã số sinh viên và mật khẩu.',
  parameters: [
    {
      name: 'username',
      type: 'string',
      description: 'Mã số sinh viên TVU',
      required: true,
    },
    {
      name: 'password',
      type: 'string',
      description: 'Mật khẩu đăng nhập',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParams(TvuLoginSchema, params);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      debugLog('TVU:Login', `Attempting login for ${data.username}`);
      const result = await tvuLogin(data.username, data.password);

      return {
        success: true,
        data: {
          message: 'Đăng nhập thành công!',
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

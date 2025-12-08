/**
 * Friend Request Tools - Tìm người và gửi lời mời kết bạn
 * API: findUser, sendFriendRequest
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

// ═══════════════════════════════════════════════════
// FIND USER BY PHONE
// ═══════════════════════════════════════════════════

/**
 * Tìm người dùng qua số điện thoại
 */
export const findUserByPhoneTool: ToolDefinition = {
  name: 'findUserByPhone',
  description: `Tìm thông tin tài khoản Zalo dựa trên số điện thoại. Trả về User ID, tên, avatar.
Dùng User ID để kết bạn hoặc nhắn tin.
Lưu ý: Nếu người dùng chặn tìm kiếm qua SĐT, sẽ không tìm được.`,
  parameters: [
    {
      name: 'phoneNumber',
      type: 'string',
      description: 'Số điện thoại cần tìm (VD: "0912345678" hoặc "84912345678")',
      required: true,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { phoneNumber } = params;

      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return { success: false, error: 'Thiếu số điện thoại (phoneNumber)' };
      }

      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        return { success: false, error: 'Số điện thoại không hợp lệ' };
      }

      debugLog('TOOL:findUserByPhone', `Finding user by phone: ${phoneNumber}`);

      const result = await context.api.findUser(phoneNumber);
      logZaloAPI('tool:findUserByPhone', { phoneNumber }, result);

      if (!result || !result.uid) {
        return {
          success: false,
          error: 'Không tìm thấy người dùng. Có thể họ đã chặn tìm kiếm qua số điện thoại.',
        };
      }

      return {
        success: true,
        data: {
          uid: result.uid,
          displayName: result.display_name || result.zalo_name,
          zaloName: result.zalo_name,
          avatar: result.avatar,
          gender: result.gender === 0 ? 'Nam' : result.gender === 1 ? 'Nữ' : 'Không rõ',
          birthday: result.sdob || '',
          status: result.status || '',
          phoneNumber,
          message: `Tìm thấy: ${result.display_name || result.zalo_name} (ID: ${result.uid})`,
          hint: 'Dùng sendFriendRequest với userId này để gửi lời mời kết bạn',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:findUserByPhone', `Error: ${error.message}`);
      return { success: false, error: `Lỗi tìm người dùng: ${error.message}` };
    }
  },
};

// ═══════════════════════════════════════════════════
// SEND FRIEND REQUEST
// ═══════════════════════════════════════════════════

/**
 * Gửi lời mời kết bạn
 */
export const sendFriendRequestTool: ToolDefinition = {
  name: 'sendFriendRequest',
  description: `Gửi yêu cầu kết bạn đến một User ID.
Thường dùng sau khi findUserByPhone để lấy userId.
Lời nhắn tối đa 150 ký tự.`,
  parameters: [
    {
      name: 'userId',
      type: 'string',
      description: 'ID của người muốn kết bạn (lấy từ findUserByPhone)',
      required: true,
    },
    {
      name: 'message',
      type: 'string',
      description: 'Lời nhắn gửi kèm (tối đa 150 ký tự). Mặc định: "Xin chào, mình muốn kết bạn!"',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    try {
      const { userId, message } = params;

      if (!userId || typeof userId !== 'string') {
        return { success: false, error: 'Thiếu userId của người cần kết bạn' };
      }

      // Default message và giới hạn 150 ký tự
      let msg = message || 'Xin chào, mình muốn kết bạn!';
      if (msg.length > 150) {
        msg = msg.substring(0, 150);
      }

      debugLog('TOOL:sendFriendRequest', `Sending friend request to ${userId}`);

      const result = await context.api.sendFriendRequest(msg, userId);
      logZaloAPI('tool:sendFriendRequest', { userId, message: msg }, result);

      return {
        success: true,
        data: {
          userId,
          message: msg,
          result: 'Đã gửi lời mời kết bạn thành công!',
        },
      };
    } catch (error: any) {
      debugLog('TOOL:sendFriendRequest', `Error: ${error.message}`);

      // Xử lý các mã lỗi thường gặp
      const errorCode = error?.code || error?.errorCode;
      const errorMessages: Record<number, string> = {
        225: 'Đã là bạn bè rồi',
        215: 'Người này chặn nhận lời mời từ người lạ',
        222: 'Người này đã gửi lời mời cho bạn trước đó (cần accept thay vì send)',
        214: 'Bạn đã gửi lời mời rồi, đang chờ họ đồng ý',
      };

      if (errorCode && errorMessages[errorCode]) {
        return {
          success: false,
          error: errorMessages[errorCode],
          data: { errorCode },
        };
      }

      return { success: false, error: `Lỗi gửi kết bạn: ${error.message}` };
    }
  },
};

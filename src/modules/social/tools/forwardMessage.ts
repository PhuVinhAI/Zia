/**
 * Tool: forwardMessage - Chuyển tiếp tin nhắn đến người/nhóm khác
 * Hỗ trợ forward cả text và media (ảnh, video, voice, file)
 */

import { debugLog, logZaloAPI } from '../../../core/logger/logger.js';
import { ThreadType } from '../../../infrastructure/messaging/zalo/zalo.service.js';
import {
  ForwardMessageSchema,
  validateParamsWithExample,
} from '../../../shared/schemas/tools.schema.js';
import type { ToolContext, ToolDefinition, ToolResult } from '../../../shared/types/tools.types.js';

/**
 * Mapping msgType string sang logSrcType number cho Zalo API
 * Quan trọng: Nếu đặt sai loại, Zalo sẽ hiển thị tin nhắn rỗng hoặc lỗi
 */
const MSG_TYPE_MAP: Record<string, number> = {
  // Text message
  text: 1,
  chat: 1,
  webchat: 1,
  // Media types
  'chat.photo': 2,
  photo: 2,
  image: 2,
  'chat.sticker': 3,
  sticker: 3,
  'chat.voice': 4,
  voice: 4,
  'chat.video.msg': 5,
  video: 5,
  'share.file': 6,
  file: 6,
  // GIF/Doodle
  gif: 7,
  doodle: 8,
};

export const forwardMessageTool: ToolDefinition = {
  name: 'forwardMessage',
  description:
    'Chuyển tiếp (forward) tin nhắn đến một hoặc nhiều người/nhóm. Hỗ trợ forward text và media (ảnh, video, voice, file). Lưu ý: Sticker không thể forward, phải dùng sendSticker.',
  parameters: [
    {
      name: 'message',
      type: 'string',
      description: 'Nội dung tin nhắn/preview text (có thể để rỗng cho media)',
      required: true,
    },
    {
      name: 'targetThreadIds',
      type: 'string',
      description:
        'Danh sách ID người/nhóm nhận (cách nhau bởi dấu phẩy). VD: "123,456,789". Tối đa 5 người/nhóm.',
      required: true,
    },
    {
      name: 'targetType',
      type: 'string',
      description: 'Loại người nhận: "user" (cá nhân) hoặc "group" (nhóm). Mặc định: user',
      required: false,
    },
    {
      name: 'originalMsgId',
      type: 'string',
      description: 'ID tin nhắn gốc (bắt buộc để forward đúng cách)',
      required: false,
    },
    {
      name: 'originalTimestamp',
      type: 'number',
      description: 'Timestamp của tin nhắn gốc',
      required: false,
    },
    {
      name: 'msgType',
      type: 'string',
      description:
        'Loại tin nhắn gốc: "text", "chat.photo", "chat.video.msg", "chat.voice", "share.file", "chat.sticker". Mặc định: text',
      required: false,
    },
  ],
  execute: async (params: Record<string, any>, context: ToolContext): Promise<ToolResult> => {
    // Validate với Zod
    const validation = validateParamsWithExample(ForwardMessageSchema, params, 'forwardMessage');
    if (!validation.success) {
      return { success: false, error: validation.error };
    }
    const data = validation.data;

    try {
      // Kiểm tra nếu là sticker thì không hỗ trợ forward
      const msgType = data.msgType || 'text';
      if (msgType === 'sticker' || msgType === 'chat.sticker') {
        return {
          success: false,
          error:
            'Sticker không thể forward bằng forwardMessage. Hãy dùng api.sendSticker với stickerId từ tin nhắn gốc.',
        };
      }

      // Parse targetThreadIds từ string thành array
      const threadIds = data.targetThreadIds
        .split(',')
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);

      if (threadIds.length === 0) {
        return { success: false, error: 'Không có ID người/nhóm nhận hợp lệ' };
      }

      if (threadIds.length > 5) {
        return { success: false, error: 'Tối đa chỉ được forward đến 5 người/nhóm cùng lúc' };
      }

      // Xác định loại thread
      const threadType = data.targetType === 'group' ? ThreadType.Group : ThreadType.User;

      // Xác định logSrcType từ msgType
      const logSrcType = MSG_TYPE_MAP[msgType] || 1;

      // Tạo payload forward
      // Với media, message có thể để rỗng - Zalo tự render preview
      const forwardPayload: any = {
        message: data.message || '',
        ttl: 0,
      };

      // Thêm reference - QUAN TRỌNG cho forward media
      if (data.originalMsgId) {
        forwardPayload.reference = {
          id: data.originalMsgId,
          ts: data.originalTimestamp || Date.now(),
          logSrcType, // Loại tin nhắn: 1=text, 2=photo, 4=voice, 5=video, 6=file
          fwLvl: 0, // Cấp độ forward
        };
      }

      debugLog(
        'TOOL:forwardMessage',
        `Forwarding ${msgType} (logSrcType=${logSrcType}) to ${threadIds.length} recipients: ${threadIds.join(', ')}`,
      );

      // Gọi API forward
      const result = await context.api.forwardMessage(forwardPayload, threadIds, threadType);
      logZaloAPI(
        'tool:forwardMessage',
        { threadIds, targetType: data.targetType, msgType, logSrcType },
        result,
      );

      return {
        success: true,
        data: {
          message: 'Đã chuyển tiếp tin nhắn thành công',
          recipients: threadIds,
          recipientCount: threadIds.length,
          targetType: data.targetType || 'user',
          msgType,
        },
      };
    } catch (error: any) {
      debugLog('TOOL:forwardMessage', `Error: ${error.message}`);
      return {
        success: false,
        error: `Lỗi chuyển tiếp tin nhắn: ${error.message}`,
      };
    }
  },
};

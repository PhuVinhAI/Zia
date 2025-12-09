/**
 * History Converter - Convert Zalo messages sang Gemini Content format
 */
import type { Content, Part } from '@google/genai';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog } from '../../../core/logger/logger.js';
import { ThreadType } from '../../../infrastructure/messaging/zalo/zalo.service.js';
import { fetchAsBase64 } from '../httpClient.js';
import { isSupportedMime } from '../tokenCounter.js';

// Size limit cho media trong tin nhắn nhóm (từ config)
const getGroupMediaSizeLimit = () => (CONFIG.markdown?.groupMediaSizeLimitMB ?? 1) * 1024 * 1024;

// Các loại msgType hệ thống cần lưu vào history để AI hiểu context
// Bao gồm cả format từ Zalo API và từ zca-js GroupEventType
const SYSTEM_MSG_TYPES = [
  // Format từ group_event listener (zca-js)
  'group.join',
  'group.leave',
  'group.remove_member',
  'group.block_member',
  'group.add_admin',
  'group.remove_admin',
  'group.update',
  'group.update_avatar',
  'group.new_link',
  'group.new_pin_topic',
  'group.update_pin_topic',
  'group.unpin_topic',
  // Format cũ (backward compatibility)
  'group.kick',
  'group.block',
  'group.unblock',
  'group.name_change',
  'group.avatar_change',
  'group.pin',
  'group.unpin',
  'group.link_change',
  'group.setting_change',
  // Các loại khác
  'chat.undo',
  'undo',
];

/** Lấy URL media từ message content */
export function getMediaUrl(content: any, msgType?: string): string | null {
  // Sticker có format đặc biệt - lấy URL từ sticker ID
  if (msgType?.includes('sticker') && content?.id) {
    return `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${content.id}&size=130`;
  }
  return content?.href || content?.hdUrl || content?.thumbUrl || content?.thumb || null;
}

/**
 * Wrap text với tên người gửi nếu là tin nhắn nhóm
 */
function wrapTextWithSender(text: string, msg: any): string {
  const isGroup = msg.type === ThreadType.Group;
  if (!isGroup || msg.isSelf) return text;

  const senderName = msg.data?.dName || msg.data?.uidFrom || 'User';
  return `[${senderName}]: ${text}`;
}

/** Lấy MIME type từ msgType */
export function getMimeType(msgType: string, content: any): string | null {
  if (msgType?.includes('photo') || msgType === 'webchat') return 'image/png';
  if (msgType?.includes('video')) return 'video/mp4';
  if (msgType?.includes('voice')) return 'audio/aac';
  if (msgType?.includes('sticker')) return 'image/png';
  if (msgType?.includes('file')) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const ext = params?.fileExt?.toLowerCase()?.replace('.', '') || '';
    const mimeType = CONFIG.mimeTypes[ext];
    return mimeType && isSupportedMime(mimeType) ? mimeType : null;
  }
  return null;
}

/**
 * Lấy file size từ message params
 */
function getFileSize(content: any): number {
  if (!content?.params) return 0;
  try {
    const params = typeof content.params === 'string' ? JSON.parse(content.params) : content.params;
    return params?.fileSize ? Number.parseInt(params.fileSize, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Kiểm tra xem có nên skip media cho tin nhắn nhóm không
 * Skip nếu là file hoặc video > 1MB
 */
function shouldSkipMediaForGroup(msg: any, msgType: string, content: any): boolean {
  const isGroup = msg.type === ThreadType.Group;
  if (!isGroup) return false;

  const isFileOrVideo = msgType.includes('file') || msgType.includes('video');
  if (!isFileOrVideo) return false;

  const fileSize = getFileSize(content);
  return fileSize > getGroupMediaSizeLimit();
}

/**
 * Parse system message content để tạo mô tả dễ hiểu cho AI
 * Tin nhắn hệ thống từ group_event listener đã có sẵn content dạng string
 * bắt đầu bằng [HỆ THỐNG], chỉ cần trả về trực tiếp
 */
function parseSystemMessage(msg: any): string | null {
  const content = msg.data?.content;

  // Nếu content đã là string (từ fake message của group_event listener)
  // và bắt đầu bằng [HỆ THỐNG], trả về trực tiếp
  if (typeof content === 'string' && content.startsWith('[HỆ THỐNG]')) {
    return content;
  }

  // Fallback: tạo mô tả generic cho các msgType hệ thống khác
  const msgType = msg.data?.msgType || '';
  if (msgType.includes('group.') || msgType.includes('undo')) {
    return `[HỆ THỐNG] Sự kiện nhóm: ${msgType}`;
  }

  return null;
}

/**
 * Kiểm tra xem msgType có phải là tin nhắn hệ thống không
 */
function isSystemMessage(msgType: string): boolean {
  if (!msgType) return false;
  return (
    SYSTEM_MSG_TYPES.some((type) => msgType.includes(type)) ||
    msgType.includes('group.') ||
    msgType.includes('undo')
  );
}

/**
 * Convert raw Zalo message sang Gemini Content format (với media support)
 */
export async function toGeminiContent(msg: any): Promise<Content> {
  const role = msg.isSelf ? 'model' : 'user';
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || '';
  const parts: Part[] = [];

  // Xử lý tin nhắn hệ thống (group events)
  if (isSystemMessage(msgType)) {
    const systemText = parseSystemMessage(msg);
    if (systemText) {
      debugLog('HISTORY', `System message: ${systemText}`);
      parts.push({ text: systemText });
      return { role: 'user', parts }; // System messages luôn là 'user' role
    }
  }

  // Text message
  if (typeof content === 'string') {
    parts.push({ text: wrapTextWithSender(content, msg) });
    return { role, parts };
  }

  // Media messages
  const mediaUrl = getMediaUrl(content, msgType);
  const isMedia =
    msgType.includes('photo') ||
    msgType.includes('video') ||
    msgType.includes('voice') ||
    msgType.includes('sticker') ||
    msgType.includes('file') ||
    msgType === 'webchat';

  if (isMedia && mediaUrl) {
    try {
      // Thêm mô tả text
      // Lấy metadata chung cho forward
      const msgId = msg.data?.msgId || '';
      const ts = msg.data?.ts || '';
      const metaStr = `(msgId=${msgId}, msgType=${msgType}, ts=${ts})`;

      let description = '';
      if (msgType.includes('sticker')) {
        description = `[Sticker] ${metaStr}`;
      } else if (msgType.includes('photo') || msgType === 'webchat') {
        description = `[Hình ảnh] ${metaStr}`;
      } else if (msgType.includes('video')) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
        description = `[Video ${duration}s] ${metaStr}`;
      } else if (msgType.includes('voice')) {
        const params = content?.params ? JSON.parse(content.params) : {};
        const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
        description = `[Voice ${duration}s] ${metaStr}`;
      } else if (msgType.includes('file')) {
        const fileName = content?.title || 'file';
        description = `[File: ${fileName}] ${metaStr}`;
      }

      // Kiểm tra xem có nên skip media cho tin nhắn nhóm không
      if (shouldSkipMediaForGroup(msg, msgType, content)) {
        const fileSize = getFileSize(content);
        const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
        console.log(`[History] ⏭️ Skipped large media in group: ${description} (${sizeMB}MB)`);
        parts.push({ text: wrapTextWithSender(description, msg) });
        return { role, parts };
      }

      if (description) {
        // Wrap với tên người gửi nếu là nhóm
        parts.push({ text: wrapTextWithSender(description, msg) });
      }

      // Fetch và thêm media data
      const mimeType = getMimeType(msgType, content);
      if (mimeType) {
        const base64Data = await fetchAsBase64(mediaUrl);
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
          console.log(`[History] 📎 Loaded media: ${description} (${mimeType})`);
        } else {
          parts.push({ text: `${description} (không tải được)` });
        }
      } else {
        // MIME type không được hỗ trợ, chỉ lưu text mô tả
        console.log(`[History] ⚠️ Skipped unsupported media: ${description}`);
      }
    } catch (e) {
      console.error('[History] Error loading media:', e);
      parts.push({ text: '[Media không tải được]' });
    }
  } else {
    // Fallback cho các loại khác
    parts.push({ text: '[Nội dung không xác định]' });
  }

  return { role, parts };
}

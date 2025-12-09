/**
 * Message Classifier - Phân loại tin nhắn Zalo
 */

/**
 * Check if image might be a character card based on hints
 * Character cards are typically PNG files with specific naming patterns
 * 
 * Returns:
 * - 'definite': User explicitly mentioned character card keywords
 * - 'possible': URL pattern suggests it might be a character card
 * - 'unlikely': No hints found
 */
function isCharacterCardHint(caption: string, url: string): 'definite' | 'possible' | 'unlikely' {
  const lowerCaption = (caption || '').toLowerCase();
  const lowerUrl = (url || '').toLowerCase();
  
  // Check caption for explicit character card keywords
  const explicitKeywords = [
    'character card', 'char card', 'thẻ nhân vật', 'roleplay với',
    'nhập vai với', 'rp với', 'chara card', 'tavern card',
    'sillytavern', 'kobold', 'oobabooga', 'agnai', 'risu', 'pygmalion',
  ];
  
  if (explicitKeywords.some(kw => lowerCaption.includes(kw))) {
    return 'definite';
  }
  
  // Check URL for common character card patterns
  const urlPatterns = [
    'chub.ai', 'characterhub', 'pygmalion.chat',
    'risu.ai', 'janitorai', 'character_card',
    '_card.png', '-card.png', 'tavern',
  ];
  
  if (urlPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return 'possible';
  }
  
  // Check if URL ends with .png (might be character card)
  if (lowerUrl.endsWith('.png') || lowerUrl.includes('.png?')) {
    return 'possible';
  }
  
  return 'unlikely';
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'link'
  | 'contact'
  | 'doodle'
  | 'friend_added'
  | 'system'
  | 'character_card' // Character card PNG for roleplay
  | 'unknown';

export type ClassifiedMessage = {
  type: MessageType;
  message: any;
  text?: string;
  url?: string;
  thumbUrl?: string;
  mimeType?: string;
  duration?: number;
  fileSize?: number;
  fileName?: string;
  fileExt?: string;
  stickerId?: string;
  // Contact card info
  contactName?: string;
  contactAvatar?: string;
  contactUserId?: string;
  contactPhone?: string;
  // Character card flag
  isCharacterCard?: boolean;
};

/**
 * Phân loại tin nhắn chi tiết
 */
export function classifyMessage(msg: any): ClassifiedMessage {
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || '';

  // Text message
  if (typeof content === 'string' && !msgType.includes('sticker')) {
    return { type: 'text', message: msg, text: content };
  }

  // Sticker
  if (msgType === 'chat.sticker' && content?.id) {
    return { type: 'sticker', message: msg, stickerId: content.id };
  }

  // GIF - Gemini không hỗ trợ image/gif, dùng image/png
  if (msgType === 'chat.gif' && content?.href) {
    // GIF có thể có nhiều URL: href (normal), hd (HD), small (thumbnail)
    const params = content?.params ? JSON.parse(content.params) : {};
    const hdUrl = params?.hd || content?.href;
    const keyword = params?.tracking?.keyword || '';
    return {
      type: 'gif',
      message: msg,
      url: hdUrl,
      thumbUrl: content?.thumb || params?.small,
      mimeType: 'image/png',
      text: keyword ? `(GIF: ${keyword})` : '(GIF)',
    };
  }

  // Image/Photo - Check for character card
  if (msgType === 'chat.photo' || (msgType === 'webchat' && content?.href)) {
    const url = content?.href || content?.hdUrl || content?.thumbUrl;
    // Lấy caption text nếu có (content.title chứa text đi kèm ảnh)
    const caption = content?.title || '';
    
    // Check if this might be a character card based on caption hints
    const cardHint = isCharacterCardHint(caption, url);
    
    // Only mark as character_card if user explicitly mentioned it
    // For 'possible' cases, we'll check the PNG metadata later in the processor
    if (cardHint === 'definite') {
      return { 
        type: 'character_card', 
        message: msg, 
        url, 
        mimeType: 'image/png', 
        text: caption,
        isCharacterCard: true,
      };
    }
    
    // For possible cases, mark it so processor can check PNG metadata
    if (cardHint === 'possible') {
      return { 
        type: 'image', 
        message: msg, 
        url, 
        mimeType: 'image/png', 
        text: caption,
        isCharacterCard: false, // Will be checked later
      };
    }
    
    return { type: 'image', message: msg, url, mimeType: 'image/jpeg', text: caption };
  }

  // Video
  if (msgType === 'chat.video.msg' && content?.thumb) {
    const url = content?.href || content?.hdUrl;
    const thumbUrl = content?.thumb;
    const params = content?.params ? JSON.parse(content.params) : {};
    const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
    const fileSize = params?.fileSize ? parseInt(params.fileSize, 10) : 0;
    return {
      type: 'video',
      message: msg,
      url,
      thumbUrl,
      mimeType: 'video/mp4',
      duration,
      fileSize,
    };
  }

  // Voice message
  if (msgType === 'chat.voice' && content?.href) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
    return {
      type: 'voice',
      message: msg,
      url: content.href,
      mimeType: 'audio/aac',
      duration,
    };
  }

  // File
  if (msgType === 'share.file' && content?.href) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const fileExt = (params?.fileExt?.toLowerCase() || '').replace('.', '');
    const fileSize = params?.fileSize ? parseInt(params.fileSize, 10) : 0;
    return {
      type: 'file',
      message: msg,
      url: content.href,
      fileName: content.title || 'file',
      fileExt,
      fileSize,
      mimeType: 'application/octet-stream',
    };
  }

  // Contact card (danh thiếp)
  if (msgType === 'chat.recommended' && content?.action === 'recommened.user') {
    const contactUserId = content?.params || '';
    const contactName = content?.title || '';
    const contactAvatar = content?.thumb || '';
    let contactPhone = '';
    try {
      const desc = JSON.parse(content?.description || '{}');
      contactPhone = desc?.phone || '';
    } catch {}
    return {
      type: 'contact',
      message: msg,
      contactName,
      contactAvatar,
      contactUserId,
      contactPhone,
      text: `Danh thiếp: ${contactName}${contactPhone ? ` (${contactPhone})` : ''}`,
    };
  }

  // Link (other recommended types)
  if (msgType === 'chat.recommended') {
    let url = content?.href;
    if (!url && content?.params) {
      try {
        url = JSON.parse(content.params)?.href;
      } catch {}
    }
    if (url) {
      // Lấy title (text kèm link) nếu có, nếu không thì chỉ dùng URL
      const title = content?.title || '';
      const text = title || url;
      return { type: 'link', message: msg, url, text };
    }
  }

  // Doodle (vẽ hình)
  if (msgType === 'chat.doodle' && content?.href) {
    return {
      type: 'doodle',
      message: msg,
      url: content.href,
      thumbUrl: content.thumb || content.href,
      mimeType: 'image/jpeg',
      text: '(Hình vẽ tay)',
    };
  }

  // Friend added notification (ecard kết bạn)
  if (msgType === 'chat.ecard') {
    const description = content?.description || '';
    const friendName = msg.data?.dName || '';
    // Check if this is a friend added notification
    if (description.includes('kết bạn') || content?.action === 'show.profile') {
      return {
        type: 'friend_added',
        message: msg,
        contactName: friendName,
        text: `[Thông báo hệ thống] Người dùng "${friendName}" vừa đồng ý kết bạn với bạn. Hãy gửi lời chào thân thiện đến họ.`,
      };
    }
    // Other ecard types
    return {
      type: 'system',
      message: msg,
      text: description || '(Thông báo hệ thống)',
    };
  }

  // Friend added notification (webchat format với msginfo.actionlist)
  if (msgType === 'webchat' && content?.action === 'msginfo.actionlist') {
    const title = content?.title || '';
    const friendName = msg.data?.dName || '';
    if (title.includes('kết bạn')) {
      return {
        type: 'friend_added',
        message: msg,
        contactName: friendName,
        text: `[Thông báo hệ thống] Người dùng "${friendName}" vừa đồng ý kết bạn với bạn. Hãy gửi lời chào thân thiện đến họ.`,
      };
    }
    // Other system notifications
    return {
      type: 'system',
      message: msg,
      text: title || '(Thông báo hệ thống)',
    };
  }

  return { type: 'unknown', message: msg };
}

/**
 * Phân loại nhiều tin nhắn
 */
export function classifyMessages(messages: any[]): ClassifiedMessage[] {
  return messages.map(classifyMessage);
}

/**
 * Đếm số lượng từng loại tin nhắn
 */
export function countMessageTypes(classified: ClassifiedMessage[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const c of classified) {
    result[c.type] = (result[c.type] || 0) + 1;
  }
  return result;
}

/**
 * Kiểm tra xem Bot có được nhắc đến trong tin nhắn nhóm không
 * @param message Tin nhắn raw từ Zalo
 * @param botId ID của Bot (lấy từ api.getContext().uid)
 * @param botName Tên của Bot (cấu hình trong settings)
 */
export function isBotMentioned(message: any, botId: string, botName = 'Zia'): boolean {
  const content = message.data?.content || '';

  // 1. Kiểm tra cấu trúc Mention của Zalo (msg.data.mentions)
  // Zalo thường gửi kèm mảng mentions chứa uid, len, pos
  const mentions = message.data?.mentions || [];
  if (Array.isArray(mentions)) {
    const isTagged = mentions.some((m: any) => m.uid === botId);
    if (isTagged) return true;
  }

  // 2. Kiểm tra Text thuần (Regex) phòng trường hợp Zalo không gửi mention data
  // Ví dụ: "@Zia", "Zia ơi", "bot ơi"
  const escapedName = botName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentionRegex = new RegExp(`@?(${escapedName}|bot|ad|admin)\\b`, 'i');
  return mentionRegex.test(typeof content === 'string' ? content : '');
}

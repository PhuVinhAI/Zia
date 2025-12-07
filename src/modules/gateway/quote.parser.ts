/**
 * Quote Parser - Parse quote attachment từ tin nhắn reply
 */

import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';

export interface QuoteMedia {
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif' | 'doodle' | 'none';
  url?: string;
  thumbUrl?: string;
  title?: string;
  mimeType?: string;
  stickerId?: string;
  duration?: number;
  fileExt?: string;
}

/**
 * Parse quote attachment để lấy media URL
 */
export function parseQuoteAttachment(quote: any): QuoteMedia {
  const cliMsgType = quote?.cliMsgType;

  // Sticker: cliMsgType = 5 (static) hoặc 36 (animated) hoặc có sticker pattern trong msg
  if (cliMsgType === 5 || cliMsgType === 36 || (quote?.msg && /^\[\^[\d.]+\^\]$/.test(quote.msg))) {
    // Try parse from msg pattern first
    const match = quote.msg?.match(/\[\^(\d+)\.(\d+)\^\]/);
    if (match) {
      return { type: 'sticker', stickerId: match[2] };
    }

    // Try parse from attach (khi msg rỗng nhưng attach có sticker info)
    if (quote?.attach) {
      try {
        const attach = typeof quote.attach === 'string' ? JSON.parse(quote.attach) : quote.attach;
        // Sticker có type = 7 trong Zalo
        if (attach?.type === 7 && attach?.id) {
          return { type: 'sticker', stickerId: String(attach.id) };
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  if (!quote?.attach) return { type: 'none' };

  try {
    const attach = typeof quote.attach === 'string' ? JSON.parse(quote.attach) : quote.attach;

    // Fallback: Check sticker từ attach.type === 7 (có thể miss ở trên nếu cliMsgType khác)
    if (attach?.type === 7 && attach?.id) {
      return { type: 'sticker', stickerId: String(attach.id) };
    }

    const href = attach?.href || attach?.hdUrl;
    const thumb = attach?.thumb;
    const params = attach?.params
      ? typeof attach.params === 'string'
        ? JSON.parse(attach.params)
        : attach.params
      : {};

    if (!href && !thumb) return { type: 'none' };

    const url = href || thumb;

    // Audio/Voice
    if (
      url &&
      (url.includes('/voice/') || url.includes('/audio/') || /\.(aac|mp3|m4a|wav|ogg)$/i.test(url))
    ) {
      const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
      return { type: 'audio', url, mimeType: 'audio/aac', duration };
    }

    // Video
    if (
      url &&
      (url.includes('/video/') || /\.(mp4|mov|avi|webm)$/i.test(url) || params?.duration)
    ) {
      const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
      return {
        type: 'video',
        url,
        thumbUrl: thumb,
        mimeType: 'video/mp4',
        duration,
      };
    }

    // File (có fileExt hoặc title với extension)
    const fileExt = params?.fileExt || attach?.title?.split('.').pop()?.toLowerCase();
    if (fileExt && !['jpg', 'jpeg', 'png', 'gif', 'webp', 'jxl'].includes(fileExt)) {
      return {
        type: 'file',
        url: href,
        title: attach?.title,
        fileExt,
        mimeType: CONFIG.mimeTypes[fileExt] || 'application/octet-stream',
      };
    }

    // GIF - check trước image vì GIF cũng match pattern image
    // Gemini không hỗ trợ image/gif, dùng image/png
    if (url && (url.includes('/gif/') || /\.gif$/i.test(url) || attach?.action === 'chat.gif')) {
      return {
        type: 'gif',
        url,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: 'image/png',
      };
    }

    // Doodle (vẽ hình)
    if (url && (url.includes('/doodle/') || attach?.action === 'chat.doodle')) {
      return {
        type: 'doodle',
        url,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: 'image/jpeg',
      };
    }

    // Image
    if (
      url &&
      (url.includes('/jpg/') ||
        url.includes('/png/') ||
        url.includes('/jxl/') ||
        url.includes('/webp/') ||
        url.includes('photo') ||
        /\.(jpg|jpeg|png|webp|jxl)$/i.test(url))
    ) {
      return {
        type: 'image',
        url,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: 'image/jpeg',
      };
    }

    // Default to image if has href
    if (href) {
      return {
        type: 'image',
        url: href,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: 'image/jpeg',
      };
    }

    return { type: 'none' };
  } catch (e) {
    debugLog('QUOTE', `Failed to parse quote attach: ${e}`);
    return { type: 'none' };
  }
}

/**
 * Extract quote content và media từ message
 */
export function extractQuoteInfo(lastMsg: any): {
  quoteContent: string | null;
  quoteMedia: QuoteMedia;
  quoteMsgId: string | null;
} {
  const quote = lastMsg.data?.quote;

  if (!quote) {
    return { quoteContent: null, quoteMedia: { type: 'none' }, quoteMsgId: null };
  }

  const quoteMedia = parseQuoteAttachment(quote);
  const quoteMsgId = quote.globalMsgId || quote.msgId || null;

  // Determine quote content based on media type
  let quoteContent: string | null = quote.msg || quote.content || null;

  // Nếu không có text content nhưng có media, tạo mô tả phù hợp
  if (!quoteContent && quoteMedia.type !== 'none') {
    switch (quoteMedia.type) {
      case 'sticker':
        quoteContent = `[Sticker ID: ${quoteMedia.stickerId}]`;
        break;
      case 'image':
        quoteContent = '[Hình ảnh]';
        break;
      case 'video':
        quoteContent = '[Video]';
        break;
      case 'audio':
        quoteContent = '[Tin nhắn thoại]';
        break;
      case 'file':
        quoteContent = `[File: ${quoteMedia.title || 'không tên'}]`;
        break;
      case 'gif':
        quoteContent = '[GIF]';
        break;
      case 'doodle':
        quoteContent = '[Hình vẽ]';
        break;
    }
  }

  if (quoteMedia.type !== 'none') {
    debugLog(
      'QUOTE',
      `User reply tin có ${quoteMedia.type}: ${quoteMedia.url?.substring(0, 50) || quoteMedia.stickerId}`,
    );
  } else if (quoteContent) {
    debugLog('QUOTE', `User reply: "${quoteContent}"`);
  }

  return {
    quoteContent: quoteContent || '(nội dung không xác định)',
    quoteMedia,
    quoteMsgId,
  };
}

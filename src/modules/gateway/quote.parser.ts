/**
 * Quote Parser - Parse quote attachment từ tin nhắn reply
 */

import { debugLog } from '../../core/logger/logger.js';
import { CONFIG } from '../../shared/constants/config.js';

export interface QuoteMedia {
  type: 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'none';
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

  // Sticker: cliMsgType = 5 hoặc có sticker pattern trong msg
  if (cliMsgType === 5 || (quote?.msg && /^\[\^[\d.]+\^\]$/.test(quote.msg))) {
    const match = quote.msg?.match(/\[\^(\d+)\.(\d+)\^\]/);
    if (match) {
      return { type: 'sticker', stickerId: match[2] };
    }
  }

  if (!quote?.attach) return { type: 'none' };

  try {
    const attach = typeof quote.attach === 'string' ? JSON.parse(quote.attach) : quote.attach;

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

    // Image
    if (
      url &&
      (url.includes('/jpg/') ||
        url.includes('/png/') ||
        url.includes('/jxl/') ||
        url.includes('/webp/') ||
        url.includes('photo') ||
        /\.(jpg|jpeg|png|gif|webp|jxl)$/i.test(url))
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
} {
  const quote = lastMsg.data?.quote;

  if (!quote) {
    return { quoteContent: null, quoteMedia: { type: 'none' } };
  }

  const quoteContent = quote.msg || quote.content || null;
  const quoteMedia = parseQuoteAttachment(quote);

  if (quoteMedia.type !== 'none') {
    console.log(
      `[Bot] 💬 User reply tin có ${quoteMedia.type}: ${quoteMedia.url?.substring(0, 50)}...`,
    );
  } else if (quoteContent) {
    console.log(`[Bot] 💬 User reply: "${quoteContent}"`);
  }

  return {
    quoteContent: quoteContent || '(nội dung không xác định)',
    quoteMedia,
  };
}

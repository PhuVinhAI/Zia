/**
 * Prompt Builder - Xây dựng prompt cho Gemini API
 */
import { PROMPTS } from '../../../infrastructure/ai/providers/gemini/prompts.js';
import type { ClassifiedMessage } from '../classifier.js';

/**
 * Build prompt thống nhất cho mọi loại tin nhắn
 */
export function buildPrompt(
  classified: ClassifiedMessage[],
  userText: string,
  quoteContent: string | null,
  quoteHasMedia: boolean,
  quoteMediaType: string | undefined,
  youtubeUrls: string[],
  mediaNotes: string[],
): string {
  const hasMedia =
    classified.some((c) =>
      ['image', 'video', 'voice', 'file', 'sticker', 'doodle', 'gif'].includes(c.type),
    ) || quoteHasMedia;

  let prompt: string;

  if (hasMedia && !quoteHasMedia) {
    // Có media từ tin nhắn mới → dùng mixedContent prompt
    const items = classified.map((c) => ({
      type: c.type,
      text: c.text,
      url: c.url,
      duration: c.duration,
      fileName: c.fileName,
      stickerId: c.stickerId,
      contactName: c.contactName,
      contactAvatar: c.contactAvatar,
      contactUserId: c.contactUserId,
      contactPhone: c.contactPhone,
      // QUAN TRỌNG: Truyền message gốc để prompt.ts lấy metadata (msgId, msgType, ts)
      message: c.message,
    }));
    prompt = PROMPTS.mixedContent(items);
    prompt += PROMPTS.mediaNote(mediaNotes);
  } else if (quoteHasMedia) {
    // Quote có media → thêm context đặc biệt
    prompt = userText || '(người dùng không nhập text)';
    const quoteText =
      quoteContent && quoteContent !== '(nội dung không xác định)' ? quoteContent : undefined;
    prompt += PROMPTS.quoteMedia(quoteText, quoteMediaType);
  } else {
    // Text only → dùng userText trực tiếp
    prompt = userText;
  }

  // Thêm quote context (chỉ khi không có media trong quote)
  if (quoteContent && !quoteHasMedia) {
    prompt += PROMPTS.quoteContext(quoteContent);
  }

  // Thêm YouTube context
  if (youtubeUrls.length > 0) {
    if (hasMedia) {
      prompt += PROMPTS.youtubeInBatch(youtubeUrls);
    } else {
      // Text-only với YouTube → override prompt
      prompt = PROMPTS.youtube(youtubeUrls, userText);
    }
  }

  return prompt;
}

/**
 * Extract text từ classified messages
 */
export function extractTextFromMessages(classified: ClassifiedMessage[]): string {
  return classified
    .filter((c) => ['text', 'link', 'contact', 'friend_added', 'system'].includes(c.type))
    .map((c) => c.text || c.url || '')
    .filter(Boolean)
    .join('\n');
}

/**
 * Xử lý prefix nếu cần
 */
export function processPrefix(
  combinedText: string,
  requirePrefix: boolean,
  prefix: string,
): { shouldContinue: boolean; userText: string } {
  if (combinedText && requirePrefix) {
    if (!combinedText.startsWith(prefix)) {
      return { shouldContinue: false, userText: '' };
    }
  }

  const userText = requirePrefix ? combinedText.replace(prefix, '').trim() : combinedText;

  return { shouldContinue: true, userText };
}

/**
 * Token Counter - Đếm token cho Gemini API
 */
import type { Content } from '@google/genai';
import { debugLog, logError } from '../../core/logger/logger.js';
import { getAIService } from '../types/ai.types.js';
import { getGeminiModel } from '../../infrastructure/gemini/geminiConfig.js';

// MIME types mà Gemini API hỗ trợ cho countTokens
const SUPPORTED_MIME_PREFIXES = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];

/** Kiểm tra MIME type có được hỗ trợ không */
export function isSupportedMime(mime: string): boolean {
  return SUPPORTED_MIME_PREFIXES.some((p) => mime.startsWith(p.split('/')[0]));
}

/** Lọc bỏ các inline data có MIME type không được hỗ trợ */
export function filterUnsupportedMedia(contents: Content[]): Content[] {
  return contents.map((content) => ({
    ...content,
    parts:
      content.parts?.map((part) => {
        if ('inlineData' in part && part.inlineData) {
          const mimeType = part.inlineData.mimeType || '';
          if (!isSupportedMime(mimeType)) return { text: `[File: ${mimeType}]` };
        }
        return part;
      }) || [],
  }));
}

/** Đếm token của một content array */
export async function countTokens(contents: Content[]): Promise<number> {
  if (contents.length === 0) return 0;
  try {
    const ai = getAIService();
    const result = await ai.countTokens({
      model: getGeminiModel(),
      contents: filterUnsupportedMedia(contents),
    });
    return result.totalTokens || 0;
  } catch (error: any) {
    logError('countTokens', error);
    // Fallback: ước tính dựa trên text length
    const text = contents
      .flatMap((c) => c.parts?.filter((p) => 'text' in p).map((p) => (p as any).text) || [])
      .join(' ');
    const estimated = Math.ceil(text.length / 4) + contents.length * 100;
    debugLog('HISTORY', `Token fallback estimate: ${estimated}`);
    return estimated;
  }
}

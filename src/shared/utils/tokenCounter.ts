/**
 * Token Counter - Đếm token cho Gemini API
 */
import type { Content } from '@google/genai';
import { debugLog, logError } from '../../core/logger/logger.js';
import { getGeminiModel } from '../../infrastructure/gemini/geminiConfig.js';
import { getAIService } from '../types/ai.types.js';

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

/** Kết quả kiểm tra token đầu vào */
export interface TokenCheckResult {
  allowed: boolean;
  totalTokens: number;
  maxTokens: number;
  message?: string;
}

/**
 * Kiểm tra tổng token đầu vào (prompt + media) có vượt giới hạn không
 * KHÔNG bao gồm history - chỉ đếm input hiện tại
 * @param contents - Content array chứa prompt và media
 * @param maxTokens - Giới hạn token (mặc định 200000)
 * @returns TokenCheckResult với thông tin chi tiết
 */
export async function checkInputTokens(
  contents: Content[],
  maxTokens: number = 200000,
): Promise<TokenCheckResult> {
  try {
    const totalTokens = await countTokens(contents);

    debugLog('TOKEN', `Input tokens: ${totalTokens}/${maxTokens}`);

    if (totalTokens > maxTokens) {
      const overBy = totalTokens - maxTokens;
      return {
        allowed: false,
        totalTokens,
        maxTokens,
        message: `⚠️ Tin nhắn quá dài! Đã vượt giới hạn ${overBy.toLocaleString()} tokens (${totalTokens.toLocaleString()}/${maxTokens.toLocaleString()}). Hãy gửi tin nhắn/file ngắn hơn.`,
      };
    }

    return {
      allowed: true,
      totalTokens,
      maxTokens,
    };
  } catch (error: any) {
    logError('checkInputTokens', error);
    // Nếu lỗi khi đếm token, cho phép tiếp tục (fail-open)
    return {
      allowed: true,
      totalTokens: 0,
      maxTokens,
      message: 'Token check failed, proceeding anyway',
    };
  }
}

import { debugLog, logError } from '../../core/logger/logger.js';
import { CONFIG } from '../constants/config.js';

// Lấy config từ settings.json
const getFetchConfig = () => ({
  timeoutMs: CONFIG.fetch?.timeoutMs ?? 60_000,
  maxRetries: CONFIG.fetch?.maxRetries ?? 3,
  retryDelayMs: CONFIG.fetch?.retryDelayMs ?? 2000,
  maxTextConvertSize: (CONFIG.fetch?.maxTextConvertSizeMB ?? 20) * 1024 * 1024,
});

/** Fetch với timeout và retry */
async function fetchWithRetry(
  url: string,
  options: { timeout?: number; maxRetries?: number } = {},
): Promise<Response> {
  const cfg = getFetchConfig();
  const timeout = options.timeout ?? cfg.timeoutMs;
  const maxRetries = options.maxRetries ?? cfg.maxRetries;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      debugLog('FETCH', `Attempt ${attempt}/${maxRetries}: ${url.substring(0, 60)}...`);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e;

      const isRetryable =
        e.name === 'AbortError' ||
        e.code === 'ECONNRESET' ||
        e.code === 'ETIMEDOUT' ||
        e.code === 'ENOTFOUND';

      if (isRetryable && attempt < maxRetries) {
        debugLog('FETCH', `Retry ${attempt}/${maxRetries} after ${e.code || e.name}`);
        await new Promise((r) => setTimeout(r, cfg.retryDelayMs * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('Fetch failed after retries');
}

export async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    debugLog('FETCH', `Fetching: ${url.substring(0, 80)}...`);
    const response = await fetchWithRetry(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    debugLog('FETCH', `Success: ${base64.length} chars base64`);
    return base64;
  } catch (e: any) {
    logError('fetchAsBase64', e);
    console.error('Lỗi tải file:', e);
    return null;
  }
}

export async function fetchAsText(url: string, maxSize?: number): Promise<string | null> {
  try {
    debugLog('FETCH', `Fetching text: ${url.substring(0, 80)}...`);
    const response = await fetchWithRetry(url);

    // Check content-length nếu có
    const contentLength = response.headers.get('content-length');
    if (contentLength && maxSize) {
      const size = parseInt(contentLength, 10);
      if (size > maxSize) {
        debugLog(
          'FETCH',
          `File too large: ${(size / 1024 / 1024).toFixed(1)}MB > ${(maxSize / 1024 / 1024).toFixed(
            1,
          )}MB limit`,
        );
        return null;
      }
    }

    const buffer = await response.arrayBuffer();

    // Double check actual size
    if (maxSize && buffer.byteLength > maxSize) {
      debugLog('FETCH', `File too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return null;
    }

    // Thử decode với UTF-8, nếu lỗi thì dùng latin1
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      debugLog('FETCH', `Text success: ${text.length} chars (UTF-8)`);
      return text;
    } catch {
      const text = new TextDecoder('latin1').decode(buffer);
      debugLog('FETCH', `Text success: ${text.length} chars (latin1)`);
      return text;
    }
  } catch (e: any) {
    logError('fetchAsText', e);
    console.error('Lỗi tải file text:', e);
    return null;
  }
}

/**
 * Tải file, convert sang text, rồi trả về base64 của text đó
 * (Như convert file sang .txt rồi encode base64)
 * Giới hạn theo config (mặc định 20MB) để tránh timeout
 */
export async function fetchAndConvertToTextBase64(url: string): Promise<string | null> {
  try {
    const cfg = getFetchConfig();
    debugLog('FETCH', `Converting to text base64: ${url.substring(0, 80)}...`);
    const textContent = await fetchAsText(url, cfg.maxTextConvertSize);
    if (!textContent) {
      debugLog('FETCH', 'Text conversion failed: no content or file too large');
      return null;
    }
    // Convert text content thành base64 (như file .txt)
    const base64 = Buffer.from(textContent, 'utf-8').toString('base64');
    debugLog('FETCH', `Text to base64 success: ${base64.length} chars`);
    return base64;
  } catch (e: any) {
    logError('fetchAndConvertToTextBase64', e);
    console.error('Lỗi convert file sang text:', e);
    return null;
  }
}

// Các định dạng Gemini hỗ trợ native
const GEMINI_SUPPORTED_FORMATS = new Set([
  // Documents
  'pdf',
  'txt',
  'html',
  'css',
  'js',
  'ts',
  'py',
  'java',
  'c',
  'cpp',
  'cs',
  'go',
  'rb',
  'php',
  'swift',
  'kt',
  'rs',
  'md',
  'json',
  'xml',
  'yaml',
  'yml',
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'heic',
  'heif',
  // Audio
  'wav',
  'mp3',
  'aiff',
  'aac',
  'ogg',
  'flac',
  // Video
  'mp4',
  'mpeg',
  'mov',
  'avi',
  'flv',
  'mpg',
  'webm',
  'wmv',
  '3gp',
]);

// Các định dạng có thể convert sang text
const TEXT_CONVERTIBLE_FORMATS = new Set([
  'doc',
  'docx',
  'rtf',
  'odt',
  'csv',
  'tsv',
  'log',
  'ini',
  'cfg',
  'conf',
  'sql',
  'sh',
  'bat',
  'ps1',
  'jsx',
  'tsx',
  'vue',
  'svelte',
  'scss',
  'sass',
  'less',
  'env',
  'gitignore',
  'dockerfile',
]);

/** Kiểm tra file có được Gemini hỗ trợ native không */
export const isGeminiSupported = (ext: string) => GEMINI_SUPPORTED_FORMATS.has(ext.toLowerCase());

/** Kiểm tra file có thể convert sang text không */
export const isTextConvertible = (ext: string) => TEXT_CONVERTIBLE_FORMATS.has(ext.toLowerCase());

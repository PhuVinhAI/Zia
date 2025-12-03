/**
 * HTTP Client - Ky-based HTTP client với retry, timeout, rate limiting
 */

import ky, { type KyInstance, type Options } from 'ky';
import { debugLog, logError } from '../../core/logger/logger.js';
import { CONFIG } from '../constants/config.js';

// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════

const getHttpConfig = () => ({
  timeoutMs: CONFIG.fetch?.timeoutMs ?? 60_000,
  maxRetries: CONFIG.fetch?.maxRetries ?? 3,
  retryDelayMs: CONFIG.fetch?.retryDelayMs ?? 2000,
  maxTextConvertSize: (CONFIG.fetch?.maxTextConvertSizeMB ?? 20) * 1024 * 1024,
});

// ═══════════════════════════════════════════════════
// BASE HTTP CLIENT
// ═══════════════════════════════════════════════════

/**
 * Tạo Ky instance với config mặc định
 */
export function createHttpClient(options: Options = {}): KyInstance {
  const cfg = getHttpConfig();

  return ky.create({
    timeout: cfg.timeoutMs,
    retry: {
      limit: cfg.maxRetries,
      methods: ['get', 'post'],
      statusCodes: [408, 429, 500, 502, 503, 504],
      backoffLimit: cfg.retryDelayMs * cfg.maxRetries,
    },
    hooks: {
      beforeRequest: [
        (request) => {
          debugLog('HTTP', `→ ${request.method} ${request.url}`);
        },
      ],
      afterResponse: [
        (_request, _options, response) => {
          debugLog('HTTP', `← ${response.status} ${response.url}`);
          return response;
        },
      ],
      beforeRetry: [
        ({ request, retryCount }) => {
          debugLog('HTTP', `↻ Retry ${retryCount}: ${request.url}`);
        },
      ],
    },
    ...options,
  });
}

// Default client instance
export const http = createHttpClient();

// ═══════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Fetch URL và trả về base64
 */
export async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    debugLog('HTTP', `Fetching base64: ${url.substring(0, 80)}...`);
    const response = await http.get(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    debugLog('HTTP', `✓ Base64: ${base64.length} chars`);
    return base64;
  } catch (e: any) {
    logError('fetchAsBase64', e);
    return null;
  }
}

/**
 * Fetch URL và trả về text
 */
export async function fetchAsText(url: string, maxSize?: number): Promise<string | null> {
  try {
    debugLog('HTTP', `Fetching text: ${url.substring(0, 80)}...`);
    const response = await http.get(url);

    // Check content-length
    const contentLength = response.headers.get('content-length');
    if (contentLength && maxSize) {
      const size = Number.parseInt(contentLength, 10);
      if (size > maxSize) {
        debugLog('HTTP', `✗ File too large: ${(size / 1024 / 1024).toFixed(1)}MB`);
        return null;
      }
    }

    const buffer = await response.arrayBuffer();

    if (maxSize && buffer.byteLength > maxSize) {
      debugLog('HTTP', `✗ File too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
      return null;
    }

    // Decode với UTF-8, fallback latin1
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      debugLog('HTTP', `✓ Text: ${text.length} chars (UTF-8)`);
      return text;
    } catch {
      const text = new TextDecoder('latin1').decode(buffer);
      debugLog('HTTP', `✓ Text: ${text.length} chars (latin1)`);
      return text;
    }
  } catch (e: any) {
    logError('fetchAsText', e);
    return null;
  }
}

/**
 * Fetch file, convert sang text, trả về base64
 */
export async function fetchAndConvertToTextBase64(url: string): Promise<string | null> {
  try {
    const cfg = getHttpConfig();
    debugLog('HTTP', `Converting to text base64: ${url.substring(0, 80)}...`);
    const textContent = await fetchAsText(url, cfg.maxTextConvertSize);
    if (!textContent) {
      debugLog('HTTP', '✗ Text conversion failed');
      return null;
    }
    const base64 = Buffer.from(textContent, 'utf-8').toString('base64');
    debugLog('HTTP', `✓ Text→Base64: ${base64.length} chars`);
    return base64;
  } catch (e: any) {
    logError('fetchAndConvertToTextBase64', e);
    return null;
  }
}

// ═══════════════════════════════════════════════════
// FILE FORMAT HELPERS
// ═══════════════════════════════════════════════════

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

export const isGeminiSupported = (ext: string) => GEMINI_SUPPORTED_FORMATS.has(ext.toLowerCase());
export const isTextConvertible = (ext: string) => TEXT_CONVERTIBLE_FORMATS.has(ext.toLowerCase());

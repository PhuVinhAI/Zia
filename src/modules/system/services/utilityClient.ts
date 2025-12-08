/**
 * Utility Client - QR Code Generator & URL Shortener
 * Sử dụng API miễn phí không cần key
 */

import { debugLog, logError } from '../../../core/logger/logger.js';
import { fetchImageAsBuffer, http } from '../../../shared/utils/httpClient.js';

// ═══════════════════════════════════════════════════
// QR CODE GENERATOR (goqr.me)
// ═══════════════════════════════════════════════════

export interface QRCodeOptions {
  data: string;
  size?: number; // 100-1000, default 300
  format?: 'png' | 'svg' | 'jpg';
}

export interface QRCodeResult {
  url: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

/**
 * Tạo QR Code từ text/URL
 * API: https://goqr.me/api/
 */
export async function generateQRCode(options: QRCodeOptions): Promise<QRCodeResult | null> {
  try {
    const { data, size = 300, format = 'png' } = options;

    // Validate size
    const validSize = Math.min(1000, Math.max(100, size));

    // Build URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${validSize}x${validSize}&data=${encodeURIComponent(data)}&format=${format}`;

    debugLog('QR', `Generating QR: ${data.substring(0, 50)}...`);

    // Fetch image
    const result = await fetchImageAsBuffer(qrUrl);
    if (!result) {
      return null;
    }

    debugLog('QR', `✓ QR generated: ${result.buffer.length} bytes`);

    return {
      url: qrUrl,
      buffer: result.buffer,
      mimeType: result.mimeType,
      size: validSize,
    };
  } catch (error: any) {
    logError('generateQRCode', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════
// URL SHORTENER (is.gd)
// ═══════════════════════════════════════════════════

export interface ShortenResult {
  originalUrl: string;
  shortUrl: string;
}

/**
 * Rút gọn URL sử dụng is.gd
 * API: https://is.gd/apishorteningreference.php
 */
export async function shortenUrl(url: string): Promise<ShortenResult | null> {
  try {
    debugLog('URL', `Shortening: ${url.substring(0, 50)}...`);

    const apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`;
    const response = await http
      .get(apiUrl)
      .json<{ shorturl?: string; errorcode?: number; errormessage?: string }>();

    if (response.errorcode || !response.shorturl) {
      debugLog('URL', `✗ Error: ${response.errormessage || 'Unknown error'}`);
      return null;
    }

    debugLog('URL', `✓ Shortened: ${response.shorturl}`);

    return {
      originalUrl: url,
      shortUrl: response.shorturl,
    };
  } catch (error: any) {
    logError('shortenUrl', error);
    return null;
  }
}

/**
 * Rút gọn URL với custom alias (v.gd)
 * API: https://v.gd/apishorteningreference.php
 */
export async function shortenUrlWithAlias(
  url: string,
  alias: string,
): Promise<ShortenResult | null> {
  try {
    debugLog('URL', `Shortening with alias "${alias}": ${url.substring(0, 50)}...`);

    const apiUrl = `https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}&shorturl=${encodeURIComponent(alias)}`;
    const response = await http
      .get(apiUrl)
      .json<{ shorturl?: string; errorcode?: number; errormessage?: string }>();

    if (response.errorcode || !response.shorturl) {
      debugLog('URL', `✗ Error: ${response.errormessage || 'Unknown error'}`);
      return null;
    }

    debugLog('URL', `✓ Shortened: ${response.shorturl}`);

    return {
      originalUrl: url,
      shortUrl: response.shorturl,
    };
  } catch (error: any) {
    logError('shortenUrlWithAlias', error);
    return null;
  }
}

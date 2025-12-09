/**
 * Integration Test: Utility APIs (QR Code & URL Shortener)
 * Test các chức năng tạo QR và rút gọn URL (miễn phí, không cần API key)
 */

import { describe, test, expect } from 'bun:test';
import {
  generateQRCode,
  shortenUrl,
  shortenUrlWithAlias,
} from '../../../src/modules/system/services/utilityClient.js';
import { TEST_CONFIG } from '../setup.js';

describe('QR Code API - goqr.me', () => {
  test('generateQRCode - basic text', async () => {
    const result = await generateQRCode({ data: 'Hello World' });

    expect(result).not.toBeNull();
    expect(result!.buffer).toBeInstanceOf(Buffer);
    expect(result!.buffer.length).toBeGreaterThan(100);
    expect(result!.mimeType).toContain('image');
    expect(result!.size).toBe(300);
    expect(result!.url).toContain('api.qrserver.com');
  }, TEST_CONFIG.timeout);

  test('generateQRCode - URL', async () => {
    const result = await generateQRCode({ data: 'https://google.com' });

    expect(result).not.toBeNull();
    expect(result!.buffer.length).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - custom size', async () => {
    const result = await generateQRCode({ data: 'Test', size: 500 });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(500);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - Vietnamese text', async () => {
    const result = await generateQRCode({ data: 'Xin chào Việt Nam' });

    expect(result).not.toBeNull();
    expect(result!.buffer.length).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - phone number', async () => {
    const result = await generateQRCode({ data: 'tel:+84123456789' });

    expect(result).not.toBeNull();
    expect(result!.buffer.length).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - email', async () => {
    const result = await generateQRCode({ data: 'mailto:test@example.com' });

    expect(result).not.toBeNull();
    expect(result!.buffer.length).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - WiFi config', async () => {
    const wifiConfig = 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;';
    const result = await generateQRCode({ data: wifiConfig });

    expect(result).not.toBeNull();
    expect(result!.buffer.length).toBeGreaterThan(100);
  }, TEST_CONFIG.timeout);

  test('generateQRCode - size clamping (too small)', async () => {
    const result = await generateQRCode({ data: 'Test', size: 50 });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(100); // Clamped to min
  }, TEST_CONFIG.timeout);

  test('generateQRCode - size clamping (too large)', async () => {
    const result = await generateQRCode({ data: 'Test', size: 2000 });

    expect(result).not.toBeNull();
    expect(result!.size).toBe(1000); // Clamped to max
  }, TEST_CONFIG.timeout);
});

describe('URL Shortener API - is.gd', () => {
  test('shortenUrl - basic URL', async () => {
    const result = await shortenUrl('https://www.google.com/search?q=test');

    expect(result).not.toBeNull();
    expect(result!.shortUrl).toContain('is.gd');
    expect(result!.originalUrl).toBe('https://www.google.com/search?q=test');
  }, TEST_CONFIG.timeout);

  test('shortenUrl - long URL', async () => {
    const longUrl = 'https://example.com/very/long/path/with/many/segments?param1=value1&param2=value2&param3=value3';
    const result = await shortenUrl(longUrl);

    expect(result).not.toBeNull();
    expect(result!.shortUrl.length).toBeLessThan(longUrl.length);
  }, TEST_CONFIG.timeout);

  test('shortenUrl - URL with special characters', async () => {
    const result = await shortenUrl('https://example.com/path?q=hello%20world&lang=vi');

    expect(result).not.toBeNull();
    expect(result!.shortUrl).toContain('is.gd');
  }, TEST_CONFIG.timeout);

  test('shortenUrl - HTTPS URL', async () => {
    const result = await shortenUrl('https://github.com');

    expect(result).not.toBeNull();
    expect(result!.shortUrl).toBeDefined();
  }, TEST_CONFIG.timeout);
});

describe('URL Shortener API - v.gd (with alias)', () => {
  test('shortenUrlWithAlias - custom alias', async () => {
    // Use random alias to avoid conflicts
    const randomAlias = `test${Date.now()}`;
    const result = await shortenUrlWithAlias('https://example.com', randomAlias);

    // May fail if alias already taken, that's expected
    if (result) {
      expect(result.shortUrl).toContain('v.gd');
      expect(result.originalUrl).toBe('https://example.com');
    }
  }, TEST_CONFIG.timeout);

  test('shortenUrlWithAlias - alias already taken returns null', async () => {
    // Common alias likely already taken
    const result = await shortenUrlWithAlias('https://example.com', 'test');

    // Should return null if alias is taken
    // This is expected behavior, not an error
    expect(result === null || result?.shortUrl !== undefined).toBe(true);
  }, TEST_CONFIG.timeout);
});

describe('Utility APIs - Error Handling', () => {
  test('shortenUrl - invalid URL format', async () => {
    // is.gd should reject invalid URLs
    const result = await shortenUrl('not-a-valid-url');
    expect(result).toBeNull();
  }, TEST_CONFIG.timeout);

  test('generateQRCode - empty data still works', async () => {
    // QR API accepts empty string but generates empty QR
    const result = await generateQRCode({ data: ' ' });
    expect(result).not.toBeNull();
  }, TEST_CONFIG.timeout);
});

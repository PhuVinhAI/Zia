/**
 * Integration Test: Google Custom Search API
 * Test các chức năng tìm kiếm web và hình ảnh
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { googleSearch } from '../../../src/modules/system/services/googleSearchClient.js';
import { hasApiKey, API_KEYS, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('googleSearch') || !API_KEYS.googleSearchCx;

describe.skipIf(SKIP)('Google Search API Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Google Search tests: API keys not configured');
  });

  test('googleSearch - tìm kiếm web cơ bản', async () => {
    const result = await googleSearch({
      q: 'TypeScript tutorial',
      num: 5,
    });

    expect(result).toBeDefined();
    expect(result.items).toBeArray();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result.totalResults).toBeDefined();
    expect(result.searchTime).toBeGreaterThan(0);

    const item = result.items[0];
    expect(item.title).toBeDefined();
    expect(item.link).toContain('http');
    expect(item.snippet).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('googleSearch - với pagination', async () => {
    const page1 = await googleSearch({ q: 'nodejs', num: 5, start: 1 });
    const page2 = await googleSearch({ q: 'nodejs', num: 5, start: 6 });

    expect(page1.items[0].link).not.toBe(page2.items[0].link);
    expect(page1.nextStartIndex).toBe(6);
  }, TEST_CONFIG.timeout);

  test('googleSearch - tìm kiếm hình ảnh', async () => {
    const result = await googleSearch({
      q: 'cute cat',
      num: 5,
      searchType: 'image',
    });

    expect(result.items).toBeArray();
    expect(result.items.length).toBeGreaterThan(0);

    const item = result.items[0];
    expect(item.link).toMatch(/\.(jpg|jpeg|png|gif|webp)/i);
  }, TEST_CONFIG.timeout);

  test('googleSearch - với language và region', async () => {
    const result = await googleSearch({
      q: 'thời tiết hôm nay',
      num: 5,
      lr: 'lang_vi',
      gl: 'vn',
    });

    expect(result.items).toBeArray();
    expect(result.items.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('googleSearch - safe search', async () => {
    const result = await googleSearch({
      q: 'programming',
      num: 3,
      safe: 'active',
    });

    expect(result.items).toBeArray();
  }, TEST_CONFIG.timeout);
});

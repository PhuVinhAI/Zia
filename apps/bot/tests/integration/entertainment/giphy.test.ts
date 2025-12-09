/**
 * Integration Test: Giphy API
 * Test các chức năng tìm kiếm và lấy GIF từ Giphy
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { searchGifs, getTrendingGifs, getRandomGif } from '../../../src/modules/entertainment/services/giphyClient.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('giphy');

describe.skipIf(SKIP)('Giphy API Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping Giphy tests: GIPHY_API_KEY not configured');
  });

  test('searchGifs - tìm kiếm GIF theo keyword', async () => {
    const result = await searchGifs('cat', { limit: 5 });

    expect(result).toBeDefined();
    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.length).toBeLessThanOrEqual(5);

    const gif = result.data[0];
    expect(gif.id).toBeDefined();
    expect(gif.title).toBeDefined();
    expect(gif.images).toBeDefined();
    expect(gif.images.original.url).toContain('giphy.com');
  }, TEST_CONFIG.timeout);

  test('searchGifs - với offset pagination', async () => {
    const page1 = await searchGifs('dog', { limit: 3, offset: 0 });
    const page2 = await searchGifs('dog', { limit: 3, offset: 3 });

    expect(page1.data[0].id).not.toBe(page2.data[0].id);
    expect(page1.pagination.offset).toBe(0);
    expect(page2.pagination.offset).toBe(3);
  }, TEST_CONFIG.timeout);

  test('getTrendingGifs - lấy GIF trending', async () => {
    const result = await getTrendingGifs({ limit: 5 });

    expect(result).toBeDefined();
    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);

    const gif = result.data[0];
    expect(gif.images.fixed_width.url).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getRandomGif - lấy GIF ngẫu nhiên', async () => {
    const result = await getRandomGif({ tag: 'funny' });

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.id).toBeDefined();
    expect(result.data.images.original.url).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getRandomGif - không có tag', async () => {
    const result = await getRandomGif();

    expect(result.data).toBeDefined();
    expect(result.data.url).toContain('giphy.com');
  }, TEST_CONFIG.timeout);
});

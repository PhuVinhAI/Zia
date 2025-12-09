/**
 * Integration Test: Nekos API
 * Test các chức năng lấy ảnh anime từ Nekos API v4
 */

import { describe, test, expect } from 'bun:test';
import { nekosFetch, type NekosRandomResponse, type NekosSearchResponse } from '../../../src/modules/entertainment/services/nekosClient.js';
import { TEST_CONFIG } from '../setup.js';

describe('Nekos API Integration', () => {
  test('nekosFetch - lấy ảnh random', async () => {
    const result = await nekosFetch<NekosRandomResponse>('/images/random', {
      limit: 3,
      rating: 'safe',
    });

    expect(result).toBeArray();
    expect(result.length).toBeGreaterThan(0);

    const image = result[0];
    expect(image.id).toBeDefined();
    expect(image.rating).toBe('safe');
    // v4 random endpoint trả về url hoặc image_url
    expect(image.url || image.image_url).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('nekosFetch - search với tags', async () => {
    const result = await nekosFetch<NekosSearchResponse>('/images', {
      limit: 5,
      rating: 'safe',
    });

    expect(result).toBeDefined();
    expect(result.items).toBeArray();
    expect(result.count).toBeGreaterThanOrEqual(0);
  }, TEST_CONFIG.timeout);

  test('nekosFetch - filter by rating', async () => {
    const safeImages = await nekosFetch<NekosRandomResponse>('/images/random', {
      limit: 5,
      rating: 'safe',
    });

    for (const img of safeImages) {
      expect(img.rating).toBe('safe');
    }
  }, TEST_CONFIG.timeout);
});

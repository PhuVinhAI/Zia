/**
 * Integration Test: Jikan API (MyAnimeList)
 * Test các chức năng tìm kiếm anime/manga
 */

import { describe, test, expect } from 'bun:test';
import { jikanFetch, type JikanListResponse, type JikanSingleResponse, type JikanAnime, type JikanManga } from '../../../src/modules/entertainment/services/jikanClient.js';
import { TEST_CONFIG } from '../setup.js';

describe('Jikan API Integration', () => {
  test('jikanFetch - search anime', async () => {
    const result = await jikanFetch<JikanListResponse<JikanAnime>>('/anime', {
      q: 'Naruto',
      limit: 5,
    });

    expect(result).toBeDefined();
    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.pagination).toBeDefined();

    const anime = result.data[0];
    expect(anime.mal_id).toBeDefined();
    expect(anime.title).toBeDefined();
    expect(anime.images).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('jikanFetch - get anime by ID', async () => {
    // Naruto mal_id = 20
    const result = await jikanFetch<JikanSingleResponse<JikanAnime>>('/anime/20');

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.mal_id).toBe(20);
    expect(result.data.title).toContain('Naruto');
  }, TEST_CONFIG.timeout);

  test('jikanFetch - search manga', async () => {
    const result = await jikanFetch<JikanListResponse<JikanManga>>('/manga', {
      q: 'One Piece',
      limit: 3,
    });

    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);

    const manga = result.data[0];
    expect(manga.mal_id).toBeDefined();
    expect(manga.title).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('jikanFetch - get top anime', async () => {
    const result = await jikanFetch<JikanListResponse<JikanAnime>>('/top/anime', {
      limit: 10,
    });

    expect(result.data).toBeArray();
    expect(result.data.length).toBe(10);

    // Top anime should have high scores
    for (const anime of result.data) {
      expect(anime.score).toBeGreaterThan(8);
    }
  }, TEST_CONFIG.timeout);

  test('jikanFetch - get seasonal anime', async () => {
    const result = await jikanFetch<JikanListResponse<JikanAnime>>('/seasons/now', {
      limit: 5,
    });

    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('jikanFetch - get anime genres', async () => {
    const result = await jikanFetch<{ data: Array<{ mal_id: number; name: string }> }>('/genres/anime');

    expect(result.data).toBeArray();
    expect(result.data.length).toBeGreaterThan(0);

    const genre = result.data[0];
    expect(genre.mal_id).toBeDefined();
    expect(genre.name).toBeDefined();
  }, TEST_CONFIG.timeout);
});

/**
 * Integration Test: Jikan Tools
 * Test các tool tìm kiếm anime/manga
 */

import { describe, test, expect } from 'bun:test';
import { jikanSearchTool } from '../../../src/modules/entertainment/tools/jikanSearch.js';
import { jikanDetailsTool } from '../../../src/modules/entertainment/tools/jikanDetails.js';
import { jikanTopTool } from '../../../src/modules/entertainment/tools/jikanTop.js';
import { jikanSeasonTool } from '../../../src/modules/entertainment/tools/jikanSeason.js';
import { jikanCharactersTool } from '../../../src/modules/entertainment/tools/jikanCharacters.js';
import { jikanGenresTool } from '../../../src/modules/entertainment/tools/jikanGenres.js';
import { jikanRecommendationsTool } from '../../../src/modules/entertainment/tools/jikanRecommendations.js';
import { jikanEpisodesTool } from '../../../src/modules/entertainment/tools/jikanEpisodes.js';
import { TEST_CONFIG, mockToolContext } from '../setup.js';

describe('Jikan Tools Integration', () => {
  describe('jikanSearch', () => {
    test('jikanSearch - tìm anime theo keyword', async () => {
      const result = await jikanSearchTool.execute({
        q: 'Naruto',
        mediaType: 'anime',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.results).toBeArray();
      expect(result.data.results.length).toBeGreaterThan(0);
      expect(result.data.pagination).toBeDefined();

      const anime = result.data.results[0];
      expect(anime.id).toBeDefined();
      expect(anime.title).toBeDefined();
    }, TEST_CONFIG.timeout);

    test('jikanSearch - tìm manga', async () => {
      const result = await jikanSearchTool.execute({
        q: 'One Piece',
        mediaType: 'manga',
        limit: 3,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.results.length).toBeGreaterThan(0);
    }, TEST_CONFIG.timeout);

    test('jikanSearch - với filter status', async () => {
      const result = await jikanSearchTool.execute({
        mediaType: 'anime',
        status: 'airing',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
    }, TEST_CONFIG.timeout);

    test('jikanSearch - với orderBy score', async () => {
      const result = await jikanSearchTool.execute({
        mediaType: 'anime',
        orderBy: 'score',
        sort: 'desc',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
    }, TEST_CONFIG.timeout);
  });

  describe('jikanDetails', () => {
    test('jikanDetails - lấy chi tiết anime', async () => {
      // Naruto mal_id = 20
      const result = await jikanDetailsTool.execute({
        id: 20,
        mediaType: 'anime',
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(20);
      expect(result.data.title).toContain('Naruto');
      expect(result.data.synopsis).toBeDefined();
      expect(result.data.genres).toBeArray();
    }, TEST_CONFIG.timeout);

    test('jikanDetails - lấy chi tiết manga', async () => {
      // One Piece mal_id = 13
      const result = await jikanDetailsTool.execute({
        id: 13,
        mediaType: 'manga',
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.chapters).toBeDefined();
    }, TEST_CONFIG.timeout);
  });

  describe('jikanTop', () => {
    test('jikanTop - top anime', async () => {
      const result = await jikanTopTool.execute({
        mediaType: 'anime',
        limit: 10,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.results).toBeArray();
      expect(result.data.results.length).toBe(10);

      // Top anime should have high scores
      for (const anime of result.data.results) {
        expect(anime.score).toBeGreaterThan(8);
      }
    }, TEST_CONFIG.timeout);

    test('jikanTop - top manga', async () => {
      const result = await jikanTopTool.execute({
        mediaType: 'manga',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.results.length).toBe(5);
    }, TEST_CONFIG.timeout);

    test('jikanTop - với filter airing', async () => {
      const result = await jikanTopTool.execute({
        mediaType: 'anime',
        filter: 'airing',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
    }, TEST_CONFIG.timeout);

    test('jikanTop - với filter bypopularity', async () => {
      const result = await jikanTopTool.execute({
        mediaType: 'anime',
        filter: 'bypopularity',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
    }, TEST_CONFIG.timeout);
  });

  describe('jikanSeason', () => {
    test('jikanSeason - mùa hiện tại', async () => {
      const result = await jikanSeasonTool.execute({
        mode: 'now',
        limit: 10,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('now');
      expect(result.data.results).toBeArray();
    }, TEST_CONFIG.timeout);

    test('jikanSeason - upcoming', async () => {
      const result = await jikanSeasonTool.execute({
        mode: 'upcoming',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('upcoming');
    }, TEST_CONFIG.timeout);

    test('jikanSeason - schedule theo ngày', async () => {
      const result = await jikanSeasonTool.execute({
        mode: 'schedule',
        day: 'monday',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.mode).toBe('schedule');
    }, TEST_CONFIG.timeout);
  });

  describe('jikanCharacters', () => {
    test('jikanCharacters - lấy nhân vật anime', async () => {
      // Naruto mal_id = 20
      const result = await jikanCharactersTool.execute({
        id: 20,
        mediaType: 'anime',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.animeId).toBe(20);
      expect(result.data.characters).toBeArray();
      expect(result.data.characters.length).toBeLessThanOrEqual(5);

      if (result.data.characters.length > 0) {
        const char = result.data.characters[0];
        expect(char.name).toBeDefined();
        expect(char.role).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
  });

  describe('jikanGenres', () => {
    test('jikanGenres - lấy genres anime', async () => {
      const result = await jikanGenresTool.execute({
        mediaType: 'anime',
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.mediaType).toBe('anime');
      expect(result.data.genres).toBeArray();
      expect(result.data.totalGenres).toBeGreaterThan(0);

      const genre = result.data.genres[0];
      expect(genre.id).toBeDefined();
      expect(genre.name).toBeDefined();
    }, TEST_CONFIG.timeout);

    test('jikanGenres - lấy genres manga', async () => {
      const result = await jikanGenresTool.execute({
        mediaType: 'manga',
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.mediaType).toBe('manga');
    }, TEST_CONFIG.timeout);
  });

  describe('jikanRecommendations', () => {
    test('jikanRecommendations - gợi ý anime tương tự', async () => {
      // Naruto mal_id = 20
      const result = await jikanRecommendationsTool.execute({
        id: 20,
        mediaType: 'anime',
        limit: 5,
      }, mockToolContext);

      expect(result.success).toBe(true);
      expect(result.data.sourceId).toBe(20);
      expect(result.data.recommendations).toBeArray();

      if (result.data.recommendations.length > 0) {
        const rec = result.data.recommendations[0];
        expect(rec.id).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.votes).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
  });

  describe('jikanEpisodes', () => {
    test('jikanEpisodes - lấy danh sách tập', async () => {
      // Naruto mal_id = 20
      const result = await jikanEpisodesTool.execute({
        id: 20,
        page: 1,
      }, mockToolContext);

      // May fail due to rate limiting
      if (result.success) {
        expect(result.data.animeId).toBe(20);
        expect(result.data.episodes).toBeArray();
        expect(result.data.pagination).toBeDefined();

        if (result.data.episodes.length > 0) {
          const ep = result.data.episodes[0];
          expect(ep.number).toBeDefined();
          expect(ep.title).toBeDefined();
        }
      } else {
        // Rate limited or API error - skip gracefully
        console.log('⏭️  jikanEpisodes skipped due to API error:', result.error);
        expect(result.error).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
  });
});

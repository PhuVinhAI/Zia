/**
 * Integration Test: YouTube Data API v3
 * Test các chức năng tìm kiếm video, channel trên YouTube
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  searchYouTube,
  getVideoDetails,
  getChannelDetails,
  parseDuration,
  formatViewCount,
} from '../../../src/modules/system/services/youtubeClient.js';
import { hasApiKey, TEST_CONFIG } from '../setup.js';

const SKIP = !hasApiKey('youtube');

describe.skipIf(SKIP)('YouTube API Integration', () => {
  beforeAll(() => {
    if (SKIP) console.log('⏭️  Skipping YouTube tests: YOUTUBE_API_KEY not configured');
  });

  test('searchYouTube - tìm kiếm video', async () => {
    const result = await searchYouTube({
      q: 'javascript tutorial',
      type: 'video',
      maxResults: 5,
    });

    expect(result).toBeDefined();
    expect(result.items).toBeArray();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(5);

    const video = result.items[0];
    expect(video.id.videoId).toBeDefined();
    expect(video.snippet.title).toBeDefined();
    expect(video.snippet.channelTitle).toBeDefined();
    expect(video.snippet.thumbnails).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('searchYouTube - tìm kiếm channel', async () => {
    const result = await searchYouTube({
      q: 'Fireship',
      type: 'channel',
      maxResults: 3,
    });

    expect(result.items).toBeArray();
    expect(result.items.length).toBeGreaterThan(0);

    const channel = result.items[0];
    expect(channel.id.channelId).toBeDefined();
    expect(channel.snippet.channelTitle).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('searchYouTube - với order và regionCode', async () => {
    const result = await searchYouTube({
      q: 'music',
      type: 'video',
      maxResults: 5,
      order: 'viewCount',
      regionCode: 'VN',
    });

    expect(result.items).toBeArray();
    expect(result.pageInfo.totalResults).toBeGreaterThan(0);
  }, TEST_CONFIG.timeout);

  test('getVideoDetails - lấy chi tiết video', async () => {
    // Rick Astley - Never Gonna Give You Up
    const video = await getVideoDetails({ videoId: 'dQw4w9WgXcQ' });

    expect(video).toBeDefined();
    expect(video!.id).toBe('dQw4w9WgXcQ');
    expect(video!.snippet.title).toContain('Never Gonna Give You Up');
    expect(video!.statistics).toBeDefined();
    expect(video!.contentDetails).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('getChannelDetails - lấy chi tiết channel', async () => {
    // Google channel ID
    const channel = await getChannelDetails({ channelId: 'UCK8sQmJBp8GCxrOtXWBpyEA' });

    expect(channel).toBeDefined();
    expect(channel!.snippet.title).toBeDefined();
    expect(channel!.statistics).toBeDefined();
  }, TEST_CONFIG.timeout);

  test('parseDuration - parse ISO 8601 duration', () => {
    expect(parseDuration('PT3M44S')).toBe('3:44');
    expect(parseDuration('PT1H30M15S')).toBe('1:30:15');
    expect(parseDuration('PT45S')).toBe('0:45');
    expect(parseDuration('PT10M')).toBe('10:00');
  });

  test('formatViewCount - format số lượt xem', () => {
    expect(formatViewCount('1500000000')).toBe('1.5B');
    expect(formatViewCount('2500000')).toBe('2.5M');
    expect(formatViewCount('15000')).toBe('15.0K');
    expect(formatViewCount('500')).toBe('500');
  });
});

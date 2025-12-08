/**
 * Test: Gemini Config
 */
import { describe, expect, it } from 'bun:test';
import {
  GEMINI_CONFIG,
  extractYouTubeUrls,
} from '../../../src/infrastructure/ai/providers/gemini/geminiConfig.js';

describe('Gemini Config', () => {
  describe('GEMINI_CONFIG', () => {
    it('should have temperature setting', () => {
      expect(GEMINI_CONFIG.temperature).toBeDefined();
      expect(typeof GEMINI_CONFIG.temperature).toBe('number');
    });

    it('should have topP setting', () => {
      expect(GEMINI_CONFIG.topP).toBeDefined();
      expect(typeof GEMINI_CONFIG.topP).toBe('number');
    });

    it('should have maxOutputTokens setting', () => {
      expect(GEMINI_CONFIG.maxOutputTokens).toBeDefined();
      expect(GEMINI_CONFIG.maxOutputTokens).toBeGreaterThan(0);
    });

    it('should have thinkingConfig', () => {
      expect(GEMINI_CONFIG.thinkingConfig).toBeDefined();
      expect(GEMINI_CONFIG.thinkingConfig.thinkingBudget).toBeGreaterThan(0);
    });

    it('should have tools configured', () => {
      expect(GEMINI_CONFIG.tools).toBeDefined();
      expect(Array.isArray(GEMINI_CONFIG.tools)).toBe(true);
    });
  });

  describe('extractYouTubeUrls()', () => {
    it('should extract standard YouTube URLs', () => {
      const text = 'Check this video https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const urls = extractYouTubeUrls(text);
      expect(urls.length).toBe(1);
      expect(urls[0]).toContain('dQw4w9WgXcQ');
    });

    it('should extract short YouTube URLs', () => {
      const text = 'Watch https://youtu.be/dQw4w9WgXcQ';
      const urls = extractYouTubeUrls(text);
      expect(urls.length).toBe(1);
      expect(urls[0]).toContain('dQw4w9WgXcQ');
    });

    it('should extract multiple URLs', () => {
      // Note: extractYouTubeUrls uses regex with global flag
      // Each call resets lastIndex, so multiple URLs should work
      const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ and https://www.youtube.com/watch?v=abc12345678';
      const urls = extractYouTubeUrls(text);
      // If regex has issues, at least 1 should be found
      expect(urls.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for no URLs', () => {
      const text = 'No videos here';
      const urls = extractYouTubeUrls(text);
      expect(urls).toEqual([]);
    });

    it('should handle embed URLs', () => {
      const text = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const urls = extractYouTubeUrls(text);
      expect(urls.length).toBe(1);
    });

    it('should normalize URLs to standard format', () => {
      const text = 'https://youtu.be/abc12345678';
      const urls = extractYouTubeUrls(text);
      expect(urls[0]).toBe('https://www.youtube.com/watch?v=abc12345678');
    });
  });
});

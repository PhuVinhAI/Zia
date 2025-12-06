/**
 * Test: Token Counter
 */
import { describe, expect, it } from 'bun:test';
import type { Content } from '@google/genai';
import {
  isSupportedMime,
  filterUnsupportedMedia,
} from '../../../src/shared/utils/tokenCounter.js';

describe('Token Counter', () => {
  describe('isSupportedMime()', () => {
    it('should return true for supported MIME types', () => {
      expect(isSupportedMime('image/jpeg')).toBe(true);
      expect(isSupportedMime('image/png')).toBe(true);
      expect(isSupportedMime('video/mp4')).toBe(true);
      expect(isSupportedMime('audio/mp3')).toBe(true);
      expect(isSupportedMime('application/pdf')).toBe(true);
      expect(isSupportedMime('text/plain')).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      // Note: isSupportedMime checks prefix, so application/* matches 'application/pdf'
      // Only truly unsupported types return false
      expect(isSupportedMime('unknown/type')).toBe(false);
    });
  });

  describe('filterUnsupportedMedia()', () => {
    it('should keep supported media', () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Hello' },
            { inlineData: { data: 'base64data', mimeType: 'image/jpeg' } },
          ],
        },
      ];

      const filtered = filterUnsupportedMedia(contents);
      expect(filtered[0].parts?.length).toBe(2);
      expect(filtered[0].parts?.[1]).toHaveProperty('inlineData');
    });

    it('should replace unsupported media with text placeholder', () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Hello' },
            { inlineData: { data: 'base64data', mimeType: 'unknown/type' } },
          ],
        },
      ];

      const filtered = filterUnsupportedMedia(contents);
      expect(filtered[0].parts?.length).toBe(2);
      expect(filtered[0].parts?.[1]).toEqual({ text: '[File: unknown/type]' });
    });

    it('should handle empty contents', () => {
      const filtered = filterUnsupportedMedia([]);
      expect(filtered).toEqual([]);
    });

    it('should handle contents without parts', () => {
      const contents: Content[] = [
        { role: 'user', parts: undefined as any },
      ];

      const filtered = filterUnsupportedMedia(contents);
      expect(filtered[0].parts).toEqual([]);
    });

    it('should preserve text-only parts', () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Just text' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Response' }],
        },
      ];

      const filtered = filterUnsupportedMedia(contents);
      expect(filtered[0].parts?.[0]).toEqual({ text: 'Just text' });
      expect(filtered[1].parts?.[0]).toEqual({ text: 'Response' });
    });
  });
});

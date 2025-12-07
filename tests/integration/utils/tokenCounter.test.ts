/**
 * Test: Token Counter
 */
import { describe, expect, it } from 'bun:test';
import type { Content } from '@google/genai';
import {
  isSupportedMime,
  filterUnsupportedMedia,
  checkInputTokens,
  type TokenCheckResult,
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

  describe('checkInputTokens()', () => {
    it('should allow input under token limit', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello, how are you?' }],
        },
      ];

      const result = await checkInputTokens(contents, 200000);

      expect(result.allowed).toBe(true);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.maxTokens).toBe(200000);
      expect(result.message).toBeUndefined();
    });

    it('should block input exceeding token limit', async () => {
      // Tạo text rất dài để vượt giới hạn nhỏ
      const longText = 'a'.repeat(1000);
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: longText }],
        },
      ];

      // Đặt giới hạn rất nhỏ để chắc chắn vượt
      const result = await checkInputTokens(contents, 10);

      expect(result.allowed).toBe(false);
      expect(result.totalTokens).toBeGreaterThan(10);
      expect(result.maxTokens).toBe(10);
      expect(result.message).toContain('⚠️');
      expect(result.message).toContain('vượt giới hạn');
    });

    it('should handle empty contents', async () => {
      const result = await checkInputTokens([], 200000);

      expect(result.allowed).toBe(true);
      expect(result.totalTokens).toBe(0);
    });

    it('should use default maxTokens of 200000', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Test' }],
        },
      ];

      const result = await checkInputTokens(contents);

      expect(result.maxTokens).toBe(200000);
    });

    it('should include media in token count', async () => {
      const textOnly: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const withMedia: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Hello' },
            { inlineData: { data: 'base64imagedata'.repeat(100), mimeType: 'image/jpeg' } },
          ],
        },
      ];

      const textResult = await checkInputTokens(textOnly, 200000);
      const mediaResult = await checkInputTokens(withMedia, 200000);

      // Media should add more tokens
      expect(mediaResult.totalTokens).toBeGreaterThanOrEqual(textResult.totalTokens);
    });

    it('should return correct TokenCheckResult structure', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Test message' }],
        },
      ];

      const result: TokenCheckResult = await checkInputTokens(contents, 100000);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('totalTokens');
      expect(result).toHaveProperty('maxTokens');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.totalTokens).toBe('number');
      expect(typeof result.maxTokens).toBe('number');
    });

    it('should handle multiple parts in content', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Part 1' },
            { text: 'Part 2' },
            { text: 'Part 3' },
          ],
        },
      ];

      const result = await checkInputTokens(contents, 200000);

      expect(result.allowed).toBe(true);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle multiple media files (images)', async () => {
      const singleMedia: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Check these images' },
            { inlineData: { data: 'imagedata1'.repeat(50), mimeType: 'image/jpeg' } },
          ],
        },
      ];

      const multipleMedia: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Check these images' },
            { inlineData: { data: 'imagedata1'.repeat(50), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'imagedata2'.repeat(50), mimeType: 'image/png' } },
            { inlineData: { data: 'imagedata3'.repeat(50), mimeType: 'image/webp' } },
          ],
        },
      ];

      const singleResult = await checkInputTokens(singleMedia, 200000);
      const multipleResult = await checkInputTokens(multipleMedia, 200000);

      // Multiple media should have more tokens than single
      expect(multipleResult.totalTokens).toBeGreaterThan(singleResult.totalTokens);
      expect(multipleResult.allowed).toBe(true);
    });

    it('should handle mixed media types (image, video, audio)', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Analyze these files' },
            { inlineData: { data: 'imagedata'.repeat(50), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'videodata'.repeat(100), mimeType: 'video/mp4' } },
            { inlineData: { data: 'audiodata'.repeat(50), mimeType: 'audio/mp3' } },
          ],
        },
      ];

      const result = await checkInputTokens(contents, 200000);

      expect(result.allowed).toBe(true);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should block when multiple media exceed token limit', async () => {
      // Tạo nhiều media lớn
      const largeMediaData = 'x'.repeat(10000);
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Check these' },
            { inlineData: { data: largeMediaData, mimeType: 'image/jpeg' } },
            { inlineData: { data: largeMediaData, mimeType: 'image/png' } },
            { inlineData: { data: largeMediaData, mimeType: 'video/mp4' } },
          ],
        },
      ];

      // Đặt giới hạn nhỏ
      const result = await checkInputTokens(contents, 100);

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('⚠️');
    });

    it('should handle text with multiple PDF files', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Summarize these documents' },
            { inlineData: { data: 'pdfcontent1'.repeat(100), mimeType: 'application/pdf' } },
            { inlineData: { data: 'pdfcontent2'.repeat(100), mimeType: 'application/pdf' } },
          ],
        },
      ];

      const result = await checkInputTokens(contents, 200000);

      expect(result.allowed).toBe(true);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should count tokens correctly for text + multiple images scenario', async () => {
      const textOnly: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Describe what you see' }],
        },
      ];

      const textWith5Images: Content[] = [
        {
          role: 'user',
          parts: [
            { text: 'Describe what you see' },
            { inlineData: { data: 'img1'.repeat(100), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'img2'.repeat(100), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'img3'.repeat(100), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'img4'.repeat(100), mimeType: 'image/jpeg' } },
            { inlineData: { data: 'img5'.repeat(100), mimeType: 'image/jpeg' } },
          ],
        },
      ];

      const textResult = await checkInputTokens(textOnly, 200000);
      const imagesResult = await checkInputTokens(textWith5Images, 200000);

      // 5 images should significantly increase token count
      expect(imagesResult.totalTokens).toBeGreaterThan(textResult.totalTokens);
    });
  });
});

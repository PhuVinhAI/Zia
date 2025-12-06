/**
 * Test: History Converter
 * Test các utility functions để convert Zalo messages sang Gemini format
 */
import { describe, expect, it } from 'bun:test';
import {
  getMediaUrl,
  getMimeType,
} from '../../../src/shared/utils/historyConverter.js';

describe('History Converter', () => {
  describe('getMediaUrl()', () => {
    it('should extract href from content', () => {
      const content = { href: 'https://example.com/image.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/image.jpg');
    });

    it('should extract hdUrl from content', () => {
      const content = { hdUrl: 'https://example.com/hd.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/hd.jpg');
    });

    it('should extract thumbUrl from content', () => {
      const content = { thumbUrl: 'https://example.com/thumb.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/thumb.jpg');
    });

    it('should extract thumb from content', () => {
      const content = { thumb: 'https://example.com/t.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/t.jpg');
    });

    it('should prioritize href over other URLs', () => {
      const content = {
        href: 'https://example.com/href.jpg',
        hdUrl: 'https://example.com/hd.jpg',
        thumbUrl: 'https://example.com/thumb.jpg',
      };
      expect(getMediaUrl(content)).toBe('https://example.com/href.jpg');
    });

    it('should return null for empty content', () => {
      expect(getMediaUrl({})).toBeNull();
      expect(getMediaUrl(null)).toBeNull();
      expect(getMediaUrl(undefined)).toBeNull();
    });
  });

  describe('getMimeType()', () => {
    it('should return image/png for photo messages', () => {
      expect(getMimeType('chat.photo', {})).toBe('image/png');
      expect(getMimeType('photo', {})).toBe('image/png');
    });

    it('should return image/png for webchat messages', () => {
      expect(getMimeType('webchat', {})).toBe('image/png');
    });

    it('should return video/mp4 for video messages', () => {
      expect(getMimeType('chat.video', {})).toBe('video/mp4');
      expect(getMimeType('video', {})).toBe('video/mp4');
    });

    it('should return audio/aac for voice messages', () => {
      expect(getMimeType('chat.voice', {})).toBe('audio/aac');
      expect(getMimeType('voice', {})).toBe('audio/aac');
    });

    it('should return image/png for sticker messages', () => {
      expect(getMimeType('chat.sticker', {})).toBe('image/png');
      expect(getMimeType('sticker', {})).toBe('image/png');
    });

    it('should return null for unsupported types', () => {
      expect(getMimeType('unknown', {})).toBeNull();
      expect(getMimeType('', {})).toBeNull();
    });

    it('should handle file messages with supported extensions', () => {
      const content = { params: JSON.stringify({ fileExt: 'pdf' }) };
      const mimeType = getMimeType('chat.file', content);
      expect(mimeType).toBe('application/pdf');
    });

    it('should return null for unsupported file extensions', () => {
      const content = { params: JSON.stringify({ fileExt: 'xyz' }) };
      const mimeType = getMimeType('chat.file', content);
      expect(mimeType).toBeNull();
    });
  });
});

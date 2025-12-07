/**
 * Test: History Converter
 * Test các utility functions chuyển đổi Zalo message sang Gemini format
 */
import { describe, expect, it } from 'bun:test';
import { ThreadType } from '../../../src/infrastructure/zalo/zalo.service.js';
import {
  getMediaUrl,
  getMimeType,
  toGeminiContent,
} from '../../../src/shared/utils/historyConverter.js';

describe('History Converter', () => {
  describe('getMediaUrl()', () => {
    it('should return href if available', () => {
      const content = { href: 'https://example.com/image.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/image.jpg');
    });

    it('should return hdUrl if href not available', () => {
      const content = { hdUrl: 'https://example.com/hd.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/hd.jpg');
    });

    it('should return thumbUrl if others not available', () => {
      const content = { thumbUrl: 'https://example.com/thumb.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/thumb.jpg');
    });

    it('should return thumb as fallback', () => {
      const content = { thumb: 'https://example.com/thumb2.jpg' };
      expect(getMediaUrl(content)).toBe('https://example.com/thumb2.jpg');
    });

    it('should prioritize href over others', () => {
      const content = {
        href: 'https://example.com/main.jpg',
        hdUrl: 'https://example.com/hd.jpg',
        thumbUrl: 'https://example.com/thumb.jpg',
      };
      expect(getMediaUrl(content)).toBe('https://example.com/main.jpg');
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
  });

  describe('toGeminiContent()', () => {
    it('should convert text message from user', async () => {
      const msg = {
        isSelf: false,
        data: { content: 'Hello world!' },
      };

      const result = await toGeminiContent(msg);

      expect(result.role).toBe('user');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toHaveProperty('text', 'Hello world!');
    });

    it('should convert text message from bot (model)', async () => {
      const msg = {
        isSelf: true,
        data: { content: 'Hi there!' },
      };

      const result = await toGeminiContent(msg);

      expect(result.role).toBe('model');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toHaveProperty('text', 'Hi there!');
    });

    it('should handle empty text message', async () => {
      const msg = {
        isSelf: false,
        data: { content: '' },
      };

      const result = await toGeminiContent(msg);

      expect(result.role).toBe('user');
      expect(result.parts[0]).toHaveProperty('text', '');
    });

    it('should handle message with special characters', async () => {
      const msg = {
        isSelf: false,
        data: { content: '🎉 Hello! <script>alert("xss")</script> & "quotes"' },
      };

      const result = await toGeminiContent(msg);

      expect(result.parts[0]).toHaveProperty(
        'text',
        '🎉 Hello! <script>alert("xss")</script> & "quotes"',
      );
    });

    it('should handle multiline text', async () => {
      const msg = {
        isSelf: false,
        data: {
          content: `Line 1
Line 2
Line 3`,
        },
      };

      const result = await toGeminiContent(msg);

      expect(result.parts[0]).toHaveProperty('text');
      const text = (result.parts[0] as { text: string }).text;
      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
      expect(text).toContain('Line 3');
    });

    it('should handle non-string content as unknown', async () => {
      const msg = {
        isSelf: false,
        data: {
          content: { someObject: true },
          msgType: 'unknown',
        },
      };

      const result = await toGeminiContent(msg);

      // Should have fallback text for unknown content
      expect(result.parts.length).toBeGreaterThan(0);
    });
  });

  describe('Media message type detection', () => {
    // Note: Không test fetch media thật vì cần URL hợp lệ
    // Chỉ test logic detection và fallback

    it('should handle media message without valid URL gracefully', async () => {
      const msg = {
        isSelf: false,
        data: {
          content: {}, // No URL
          msgType: 'chat.photo',
        },
      };

      const result = await toGeminiContent(msg);

      // Should have fallback content
      expect(result.parts.length).toBeGreaterThan(0);
      expect(result.role).toBe('user');
    });

    it('should detect sticker message type', () => {
      const mimeType = getMimeType('chat.sticker', {});
      expect(mimeType).toBe('image/png');
    });

    it('should detect photo message type', () => {
      const mimeType = getMimeType('chat.photo', {});
      expect(mimeType).toBe('image/png');
    });

    it('should detect video message type', () => {
      const mimeType = getMimeType('chat.video', {});
      expect(mimeType).toBe('video/mp4');
    });

    it('should detect voice message type', () => {
      const mimeType = getMimeType('chat.voice', {});
      expect(mimeType).toBe('audio/aac');
    });
  });

  describe('Group message media filtering', () => {
    it('should skip large file (>1MB) in group message and return placeholder', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/large-file.pdf',
            title: 'document.pdf',
            params: JSON.stringify({ fileSize: 5 * 1024 * 1024 }), // 5MB
          },
          msgType: 'share.file',
          dName: 'TestUser',
        },
      };

      const result = await toGeminiContent(msg);

      expect(result.role).toBe('user');
      expect(result.parts).toHaveLength(1);
      // Should only have text placeholder, no inlineData
      expect(result.parts[0]).toHaveProperty('text');
      expect(result.parts[0]).not.toHaveProperty('inlineData');
      expect((result.parts[0] as { text: string }).text).toContain('[File: document.pdf]');
    });

    it('should skip large video (>1MB) in group message and return placeholder', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/large-video.mp4',
            params: JSON.stringify({ duration: 30000, fileSize: 10 * 1024 * 1024 }), // 10MB
          },
          msgType: 'chat.video',
          dName: 'TestUser',
        },
      };

      const result = await toGeminiContent(msg);

      expect(result.role).toBe('user');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0]).toHaveProperty('text');
      expect(result.parts[0]).not.toHaveProperty('inlineData');
      expect((result.parts[0] as { text: string }).text).toContain('[Video 30s]');
    });

    it('should NOT skip small file (<1MB) in group message', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/small-file.txt',
            title: 'small.txt',
            params: JSON.stringify({ fileSize: 500 * 1024, fileExt: 'txt' }), // 500KB
          },
          msgType: 'share.file',
          dName: 'TestUser',
        },
      };

      const result = await toGeminiContent(msg);

      // Should attempt to load media (will fail due to invalid URL, but logic is correct)
      expect(result.role).toBe('user');
      expect(result.parts.length).toBeGreaterThan(0);
    });

    it('should NOT skip photo in group message (photos are always allowed)', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/photo.jpg',
            params: JSON.stringify({ fileSize: 2 * 1024 * 1024 }), // 2MB photo
          },
          msgType: 'chat.photo',
          dName: 'TestUser',
        },
      };

      const result = await toGeminiContent(msg);

      // Photo should not be skipped even if large
      expect(result.role).toBe('user');
      expect(result.parts.length).toBeGreaterThan(0);
      // Should have description text
      expect((result.parts[0] as { text: string }).text).toContain('[Hình ảnh]');
    });

    it('should NOT skip file/video in user (non-group) message regardless of size', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.User, // User chat, not group
        data: {
          content: {
            href: 'https://example.com/large-file.pdf',
            title: 'document.pdf',
            params: JSON.stringify({ fileSize: 10 * 1024 * 1024 }), // 10MB
          },
          msgType: 'share.file',
        },
      };

      const result = await toGeminiContent(msg);

      // Should attempt to load media in user chat
      expect(result.role).toBe('user');
      expect(result.parts.length).toBeGreaterThan(0);
    });

    it('should handle file without fileSize in params', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/file.pdf',
            title: 'file.pdf',
            params: JSON.stringify({}), // No fileSize
          },
          msgType: 'share.file',
          dName: 'TestUser',
        },
      };

      const result = await toGeminiContent(msg);

      // Should not skip if fileSize is unknown (0)
      expect(result.role).toBe('user');
      expect(result.parts.length).toBeGreaterThan(0);
    });

    it('should wrap sender name in group message placeholder', async () => {
      const msg = {
        isSelf: false,
        type: ThreadType.Group,
        data: {
          content: {
            href: 'https://example.com/large-video.mp4',
            params: JSON.stringify({ duration: 60000, fileSize: 20 * 1024 * 1024 }), // 20MB
          },
          msgType: 'chat.video',
          dName: 'NguyenVanA',
        },
      };

      const result = await toGeminiContent(msg);

      expect(result.parts).toHaveLength(1);
      const text = (result.parts[0] as { text: string }).text;
      expect(text).toContain('[NguyenVanA]');
      expect(text).toContain('[Video 60s]');
    });
  });
});

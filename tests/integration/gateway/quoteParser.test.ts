/**
 * Integration Test: Quote Parser
 * Test chức năng parse quote attachment từ tin nhắn reply
 */

import { describe, test, expect } from 'bun:test';
import { parseQuoteAttachment, extractQuoteInfo } from '../../../src/modules/gateway/quote.parser.js';

describe('Quote Parser Integration', () => {
  describe('parseQuoteAttachment', () => {
    test('parse image attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/jpg/image.jpg',
          thumb: 'https://example.com/thumb.jpg',
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('image');
      expect(result.url).toContain('image.jpg');
      expect(result.thumbUrl).toBeDefined();
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('parse video attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/video/clip.mp4',
          thumb: 'https://example.com/thumb.jpg',
          params: JSON.stringify({ duration: 30000 }),
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('video');
      expect(result.url).toContain('clip.mp4');
      expect(result.duration).toBe(30);
      expect(result.mimeType).toBe('video/mp4');
    });

    test('parse audio attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/voice/audio.aac',
          params: JSON.stringify({ duration: 5000 }),
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('audio');
      expect(result.duration).toBe(5);
      expect(result.mimeType).toBe('audio/aac');
    });

    test('parse file attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/file/document.pdf',
          title: 'document.pdf',
          params: JSON.stringify({ fileExt: 'pdf' }),
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('file');
      expect(result.fileExt).toBe('pdf');
      expect(result.title).toBe('document.pdf');
    });

    test('parse sticker', () => {
      const quote = {
        cliMsgType: 5,
        msg: '[^1.12345^]',
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('sticker');
      expect(result.stickerId).toBe('12345');
    });

    test('parse gif attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/gif/funny.gif',
          action: 'chat.gif',
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('gif');
      expect(result.mimeType).toBe('image/png'); // Gemini không hỗ trợ gif
    });

    test('parse doodle attachment', () => {
      const quote = {
        attach: JSON.stringify({
          href: 'https://example.com/doodle/drawing.jpg',
          action: 'chat.doodle',
        }),
      };

      const result = parseQuoteAttachment(quote);

      expect(result.type).toBe('doodle');
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('return none for empty quote', () => {
      const result = parseQuoteAttachment({});
      expect(result.type).toBe('none');
    });

    test('return none for null quote', () => {
      const result = parseQuoteAttachment(null);
      expect(result.type).toBe('none');
    });

    test('handle invalid JSON gracefully', () => {
      const quote = {
        attach: 'invalid json {{{',
      };

      const result = parseQuoteAttachment(quote);
      expect(result.type).toBe('none');
    });
  });

  describe('extractQuoteInfo', () => {
    test('extract quote with text content', () => {
      const lastMsg = {
        data: {
          quote: {
            msg: 'Original message content',
            globalMsgId: 'msg-123',
          },
        },
      };

      const result = extractQuoteInfo(lastMsg);

      expect(result.quoteContent).toBe('Original message content');
      expect(result.quoteMsgId).toBe('msg-123');
      expect(result.quoteMedia.type).toBe('none');
    });

    test('extract quote with media', () => {
      const lastMsg = {
        data: {
          quote: {
            msg: 'Check this image',
            globalMsgId: 'msg-456',
            attach: JSON.stringify({
              href: 'https://example.com/photo/test.jpg',
            }),
          },
        },
      };

      const result = extractQuoteInfo(lastMsg);

      expect(result.quoteContent).toBe('Check this image');
      expect(result.quoteMedia.type).toBe('image');
      expect(result.quoteMedia.url).toContain('test.jpg');
    });

    test('return null for message without quote', () => {
      const lastMsg = {
        data: {
          content: 'Normal message',
        },
      };

      const result = extractQuoteInfo(lastMsg);

      expect(result.quoteContent).toBeNull();
      expect(result.quoteMedia.type).toBe('none');
      expect(result.quoteMsgId).toBeNull();
    });

    test('handle empty quote content', () => {
      const lastMsg = {
        data: {
          quote: {
            globalMsgId: 'msg-789',
          },
        },
      };

      const result = extractQuoteInfo(lastMsg);

      expect(result.quoteContent).toBe('(nội dung không xác định)');
    });
  });
});

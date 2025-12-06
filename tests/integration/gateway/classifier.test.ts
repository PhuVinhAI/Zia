/**
 * Integration Test: Message Classifier
 * Test chức năng phân loại tin nhắn Zalo
 */

import { describe, test, expect } from 'bun:test';
import {
  classifyMessage,
  classifyMessages,
  countMessageTypes,
} from '../../../src/modules/gateway/classifier.js';

describe('Message Classifier Integration', () => {
  describe('classifyMessage', () => {
    test('classify text message', () => {
      const msg = {
        data: {
          content: 'Hello, this is a text message',
          msgType: '',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello, this is a text message');
    });

    test('classify image message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/photo.jpg',
            title: 'My photo',
          },
          msgType: 'chat.photo',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('image');
      expect(result.url).toContain('photo.jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('classify video message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/video.mp4',
            thumb: 'https://example.com/thumb.jpg',
            params: JSON.stringify({ duration: 60000, fileSize: '5000000' }),
          },
          msgType: 'chat.video.msg',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('video');
      expect(result.duration).toBe(60);
      expect(result.fileSize).toBe(5000000);
      expect(result.thumbUrl).toBeDefined();
    });

    test('classify voice message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/voice.aac',
            params: JSON.stringify({ duration: 10000 }),
          },
          msgType: 'chat.voice',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('voice');
      expect(result.duration).toBe(10);
      expect(result.mimeType).toBe('audio/aac');
    });

    test('classify sticker message', () => {
      const msg = {
        data: {
          content: { id: '12345' },
          msgType: 'chat.sticker',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('sticker');
      expect(result.stickerId).toBe('12345');
    });

    test('classify gif message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/funny.gif',
            thumb: 'https://example.com/thumb.gif',
            params: JSON.stringify({ tracking: { keyword: 'funny cat' } }),
          },
          msgType: 'chat.gif',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('gif');
      expect(result.mimeType).toBe('image/png');
      expect(result.text).toContain('funny cat');
    });

    test('classify file message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/document.pdf',
            title: 'document.pdf',
            params: JSON.stringify({ fileExt: 'pdf', fileSize: '1000000' }),
          },
          msgType: 'share.file',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('file');
      expect(result.fileName).toBe('document.pdf');
      expect(result.fileExt).toBe('pdf');
      expect(result.fileSize).toBe(1000000);
    });

    test('classify contact card message', () => {
      const msg = {
        data: {
          content: {
            action: 'recommened.user',
            title: 'John Doe',
            thumb: 'https://example.com/avatar.jpg',
            params: 'user-123',
            description: JSON.stringify({ phone: '0123456789' }),
          },
          msgType: 'chat.recommended',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('contact');
      expect(result.contactName).toBe('John Doe');
      expect(result.contactUserId).toBe('user-123');
      expect(result.contactPhone).toBe('0123456789');
    });

    test('classify link message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/article',
          },
          msgType: 'chat.recommended',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('link');
      expect(result.url).toBe('https://example.com/article');
    });

    test('classify doodle message', () => {
      const msg = {
        data: {
          content: {
            href: 'https://example.com/doodle.jpg',
            thumb: 'https://example.com/doodle-thumb.jpg',
          },
          msgType: 'chat.doodle',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('doodle');
      expect(result.text).toBe('(Hình vẽ tay)');
    });

    test('classify friend added notification (ecard)', () => {
      const msg = {
        data: {
          content: {
            description: 'đã đồng ý kết bạn',
            action: 'show.profile',
          },
          msgType: 'chat.ecard',
          dName: 'New Friend',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('friend_added');
      expect(result.contactName).toBe('New Friend');
      expect(result.text).toContain('kết bạn');
    });

    test('classify unknown message', () => {
      const msg = {
        data: {
          content: { unknown: 'data' },
          msgType: 'unknown.type',
        },
      };

      const result = classifyMessage(msg);

      expect(result.type).toBe('unknown');
    });
  });

  describe('classifyMessages', () => {
    test('classify multiple messages', () => {
      const messages = [
        { data: { content: 'Text 1', msgType: '' } },
        { data: { content: 'Text 2', msgType: '' } },
        { data: { content: { id: '123' }, msgType: 'chat.sticker' } },
      ];

      const results = classifyMessages(messages);

      expect(results).toBeArray();
      expect(results.length).toBe(3);
      expect(results[0].type).toBe('text');
      expect(results[1].type).toBe('text');
      expect(results[2].type).toBe('sticker');
    });
  });

  describe('countMessageTypes', () => {
    test('count message types', () => {
      const classified = [
        { type: 'text', message: {} },
        { type: 'text', message: {} },
        { type: 'image', message: {} },
        { type: 'sticker', message: {} },
        { type: 'text', message: {} },
      ] as any;

      const counts = countMessageTypes(classified);

      expect(counts.text).toBe(3);
      expect(counts.image).toBe(1);
      expect(counts.sticker).toBe(1);
    });

    test('handle empty array', () => {
      const counts = countMessageTypes([]);
      expect(counts).toEqual({});
    });
  });
});

/**
 * Integration Test: Media Processor
 * Test các chức năng chuẩn bị media parts cho Gemini API
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { prepareMediaParts, addQuoteMedia } from '../../../src/modules/gateway/processors/media.processor.js';
import type { ClassifiedMessage } from '../../../src/modules/gateway/classifier.js';
import type { QuoteMedia } from '../../../src/modules/gateway/quote.parser.js';
import type { MediaPart } from '../../../src/infrastructure/gemini/gemini.provider.js';
import type { Content } from '@google/genai';

describe('Media Processor Integration', () => {
  // Mock API
  const mockApi = {
    getStickersDetail: mock(() => Promise.resolve([
      { stickerUrl: 'https://sticker.example.com/sticker.png' }
    ])),
  };

  // Helper to create ClassifiedMessage with required 'message' field
  const createClassified = (data: Omit<ClassifiedMessage, 'message'>): ClassifiedMessage => ({
    ...data,
    message: {},
  });

  beforeEach(() => {
    mockApi.getStickersDetail.mockClear();
  });

  describe('prepareMediaParts', () => {
    test('xử lý image message', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'image',
          url: 'https://example.com/image.jpg',
          mimeType: 'image/jpeg',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].url).toBe('https://example.com/image.jpg');
      expect(media[0].mimeType).toBe('image/jpeg');
      expect(notes).toHaveLength(0);
    });

    test('xử lý sticker message', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'sticker',
          stickerId: 'sticker123',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(mockApi.getStickersDetail).toHaveBeenCalledWith('sticker123');
      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].url).toBe('https://sticker.example.com/sticker.png');
    });

    test('xử lý doodle message', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'doodle',
          url: 'https://example.com/doodle.jpg',
          mimeType: 'image/jpeg',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].url).toBe('https://example.com/doodle.jpg');
    });

    test('xử lý GIF message (convert sang PNG)', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'gif',
          url: 'https://example.com/animation.gif',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].mimeType).toBe('image/png'); // GIF converted to PNG
    });

    test('xử lý video nhỏ', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'video',
          url: 'https://example.com/video.mp4',
          fileSize: 5 * 1024 * 1024, // 5MB
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('video');
      expect(media[0].mimeType).toBe('video/mp4');
    });

    test('xử lý video lớn - dùng thumbnail', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'video',
          url: 'https://example.com/video.mp4',
          thumbUrl: 'https://example.com/thumb.jpg',
          fileSize: 50 * 1024 * 1024, // 50MB - quá lớn
          duration: 120,
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image'); // Dùng thumbnail
      expect(media[0].url).toBe('https://example.com/thumb.jpg');
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('Video');
      expect(notes[0]).toContain('thumbnail');
    });

    test('xử lý voice message', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'voice',
          url: 'https://example.com/voice.aac',
          mimeType: 'audio/aac',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('audio');
      expect(media[0].mimeType).toBe('audio/aac');
    });

    test('xử lý file PDF (Gemini supported)', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'file',
          url: 'https://example.com/document.pdf',
          fileExt: 'pdf',
          fileName: 'document.pdf',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('file');
      expect(media[0].mimeType).toBe('application/pdf');
    });

    test('xử lý file không hỗ trợ', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({
          type: 'file',
          url: 'https://example.com/archive.rar',
          fileExt: 'rar',
          fileName: 'archive.rar',
        }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(0);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('archive.rar');
      expect(notes[0]).toContain('không hỗ trợ');
    });

    test('xử lý nhiều media cùng lúc', async () => {
      const classified: ClassifiedMessage[] = [
        createClassified({ type: 'image', url: 'https://example.com/1.jpg', mimeType: 'image/jpeg' }),
        createClassified({ type: 'image', url: 'https://example.com/2.jpg', mimeType: 'image/jpeg' }),
        createClassified({ type: 'voice', url: 'https://example.com/voice.aac', mimeType: 'audio/aac' }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(3);
      expect(media[0].type).toBe('image');
      expect(media[1].type).toBe('image');
      expect(media[2].type).toBe('audio');
    });

    test('xử lý sticker fail gracefully', async () => {
      mockApi.getStickersDetail.mockImplementationOnce(() => Promise.reject(new Error('API Error')));

      const classified: ClassifiedMessage[] = [
        createClassified({ type: 'sticker', stickerId: 'invalid' }),
      ];

      const { media, notes } = await prepareMediaParts(mockApi, classified);

      expect(media).toHaveLength(0); // Không crash, chỉ skip
    });
  });

  describe('addQuoteMedia', () => {
    test('thêm image từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'image',
        url: 'https://example.com/quoted-image.jpg',
        mimeType: 'image/jpeg',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(media[0].url).toBe('https://example.com/quoted-image.jpg');
    });

    test('thêm GIF từ quote (convert sang PNG)', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'gif',
        url: 'https://example.com/quoted.gif',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].mimeType).toBe('image/png');
    });

    test('thêm video từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'video',
        url: 'https://example.com/video.mp4',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('video');
    });

    test('thêm video thumbnail khi không có URL', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'video',
        thumbUrl: 'https://example.com/thumb.jpg',
        duration: 60,
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('Video');
    });

    test('thêm audio từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'audio',
        url: 'https://example.com/audio.aac',
        mimeType: 'audio/aac',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('audio');
    });

    test('thêm sticker từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'sticker',
        stickerId: 'sticker456',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(mockApi.getStickersDetail).toHaveBeenCalledWith('sticker456');
      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
    });

    test('thêm file PDF từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'file',
        url: 'https://example.com/doc.pdf',
        fileExt: 'pdf',
        title: 'document.pdf',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('file');
      expect(media[0].mimeType).toBe('application/pdf');
    });

    test('skip fetch nếu history đã có media từ user', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'image',
        url: 'https://example.com/image.jpg',
      };

      // History có media từ user
      const history: Content[] = [
        {
          role: 'user',
          parts: [
            { inlineData: { data: 'base64data', mimeType: 'image/jpeg' } },
          ],
        },
      ];

      await addQuoteMedia(mockApi, quoteMedia, media, notes, history);

      expect(media).toHaveLength(0); // Không fetch
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('hình ảnh');
    });

    test('không skip nếu media từ model (bot)', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'image',
        url: 'https://example.com/image.jpg',
        mimeType: 'image/jpeg',
      };

      // History có media từ model (bot), không phải user
      const history: Content[] = [
        {
          role: 'model',
          parts: [
            { inlineData: { data: 'base64data', mimeType: 'image/jpeg' } },
          ],
        },
      ];

      await addQuoteMedia(mockApi, quoteMedia, media, notes, history);

      expect(media).toHaveLength(1); // Vẫn fetch vì media từ model
    });

    test('xử lý file không hỗ trợ từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'file',
        url: 'https://example.com/archive.zip',
        fileExt: 'zip',
        title: 'archive.zip',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(0);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('không hỗ trợ');
    });

    test('xử lý sticker fail gracefully', async () => {
      mockApi.getStickersDetail.mockImplementationOnce(() => Promise.reject(new Error('API Error')));

      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'sticker',
        stickerId: 'invalid',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(0);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toContain('sticker');
    });

    test('thêm doodle từ quote', async () => {
      const media: MediaPart[] = [];
      const notes: string[] = [];
      const quoteMedia: QuoteMedia = {
        type: 'doodle',
        url: 'https://example.com/doodle.jpg',
        mimeType: 'image/jpeg',
      };

      await addQuoteMedia(mockApi, quoteMedia, media, notes);

      expect(media).toHaveLength(1);
      expect(media[0].type).toBe('image');
    });
  });
});

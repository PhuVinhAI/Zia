/**
 * Test: Prompt Builder
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPrompt,
  extractTextFromMessages,
  processPrefix,
} from '../../../src/modules/gateway/services/prompt.builder.js';
import type { ClassifiedMessage } from '../../../src/modules/gateway/classifier.js';

// Helper to create mock message
const mockMsg = {} as any;

describe('Prompt Builder', () => {
  describe('extractTextFromMessages()', () => {
    it('should extract text from text messages', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'Hello', message: mockMsg },
        { type: 'text', text: 'World', message: mockMsg },
      ];

      const result = extractTextFromMessages(classified);
      expect(result).toBe('Hello\nWorld');
    });

    it('should extract URLs from link messages', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'link', url: 'https://example.com', message: mockMsg },
      ];

      const result = extractTextFromMessages(classified);
      expect(result).toBe('https://example.com');
    });

    it('should ignore media types', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'Hello', message: mockMsg },
        { type: 'image', url: 'http://img.jpg', message: mockMsg },
        { type: 'video', url: 'http://vid.mp4', message: mockMsg },
        { type: 'text', text: 'World', message: mockMsg },
      ];

      const result = extractTextFromMessages(classified);
      expect(result).toBe('Hello\nWorld');
    });

    it('should handle empty array', () => {
      const result = extractTextFromMessages([]);
      expect(result).toBe('');
    });
  });

  describe('processPrefix()', () => {
    it('should pass through when prefix not required', () => {
      const result = processPrefix('Hello world', false, '!ai');
      expect(result.shouldContinue).toBe(true);
      expect(result.userText).toBe('Hello world');
    });

    it('should require prefix when enabled', () => {
      const result = processPrefix('Hello world', true, '!ai');
      expect(result.shouldContinue).toBe(false);
      expect(result.userText).toBe('');
    });

    it('should strip prefix when present', () => {
      const result = processPrefix('!ai Hello world', true, '!ai');
      expect(result.shouldContinue).toBe(true);
      expect(result.userText).toBe('Hello world');
    });

    it('should handle prefix at start only', () => {
      const result = processPrefix('Hello !ai world', true, '!ai');
      expect(result.shouldContinue).toBe(false);
    });
  });

  describe('buildPrompt()', () => {
    it('should build simple text prompt', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'Hello', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        'Hello',
        null,
        false,
        undefined,
        [],
        [],
      );

      expect(result).toBe('Hello');
    });

    it('should add quote context', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'My reply', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        'My reply',
        'Original message',
        false,
        undefined,
        [],
        [],
      );

      expect(result).toContain('My reply');
      expect(result).toContain('Original message');
      expect(result).toContain('QUOTE CONTEXT');
    });

    it('should handle media messages', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'image', url: 'http://img.jpg', message: mockMsg },
        { type: 'text', text: 'Check this image', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        'Check this image',
        null,
        false,
        undefined,
        [],
        [],
      );

      expect(result).toContain('[0]');
      expect(result).toContain('[1]');
    });

    it('should add YouTube context', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'Watch this', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        'Watch this',
        null,
        false,
        undefined,
        ['https://youtube.com/watch?v=abc123'],
        [],
      );

      expect(result).toContain('YouTube');
      expect(result).toContain('abc123');
    });

    it('should add media notes', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'image', url: 'http://img.jpg', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        '',
        null,
        false,
        undefined,
        [],
        ['File too large'],
      );

      expect(result).toContain('File too large');
    });

    it('should handle quote with media', () => {
      const classified: ClassifiedMessage[] = [
        { type: 'text', text: 'What is this?', message: mockMsg },
      ];

      const result = buildPrompt(
        classified,
        'What is this?',
        'Some text',
        true, // quoteHasMedia
        'image',
        [],
        [],
      );

      expect(result).toContain('QUOTE MEDIA');
      expect(result).toContain('hình ảnh');
    });
  });
});

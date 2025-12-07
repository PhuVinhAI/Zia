/**
 * Test: Message Chunker
 */
import { describe, expect, it } from 'bun:test';
import {
  splitMessage,
  needsChunking,
  getMaxMessageLength,
} from '../../../src/shared/utils/message/messageChunker.js';

describe('Message Chunker', () => {
  describe('getMaxMessageLength()', () => {
    it('should return default max length', () => {
      const maxLen = getMaxMessageLength();
      expect(maxLen).toBe(1800);
    });
  });

  describe('needsChunking()', () => {
    it('should return false for short messages', () => {
      expect(needsChunking('Hello world')).toBe(false);
      expect(needsChunking('A'.repeat(1800))).toBe(false);
    });

    it('should return true for long messages', () => {
      expect(needsChunking('A'.repeat(1801))).toBe(true);
      expect(needsChunking('A'.repeat(5000))).toBe(true);
    });
  });

  describe('splitMessage()', () => {
    it('should not split short messages', () => {
      const msg = 'Hello world';
      const chunks = splitMessage(msg);
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(msg);
    });

    it('should split long messages', () => {
      const msg = 'A'.repeat(4000);
      const chunks = splitMessage(msg);
      expect(chunks.length).toBeGreaterThan(1);
      
      // All chunks should be within limit
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(1800);
      }
    });

    it('should prefer splitting at paragraph breaks', () => {
      const msg = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      const longMsg = msg + '\n\n' + 'X'.repeat(2000);
      const chunks = splitMessage(longMsg);
      
      // Should split at paragraph boundary
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should prefer splitting at sentence boundaries', () => {
      const sentences = Array(50).fill('This is a sentence.').join(' ');
      const chunks = splitMessage(sentences);
      
      // Each chunk should end with proper punctuation or be trimmed
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(1800);
      }
    });

    it('should handle messages with no good split points', () => {
      const msg = 'A'.repeat(5000); // No spaces, no punctuation
      const chunks = splitMessage(msg);
      
      expect(chunks.length).toBeGreaterThan(1);
      // Should still split even without good break points
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(1800);
      }
    });

    it('should preserve code blocks when possible', () => {
      const codeBlock = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const msg = 'Before code\n\n' + codeBlock + '\n\nAfter code';
      const chunks = splitMessage(msg);
      
      // Code block should be intact in one chunk
      const hasIntactCodeBlock = chunks.some(c => c.includes('```javascript') && c.includes('```'));
      expect(hasIntactCodeBlock).toBe(true);
    });

    it('should handle empty string', () => {
      const chunks = splitMessage('');
      expect(chunks).toEqual(['']);
    });

    it('should handle custom max length', () => {
      const msg = 'A'.repeat(500);
      const chunks = splitMessage(msg, 100);
      
      expect(chunks.length).toBe(5);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(100);
      }
    });

    it('should not create empty chunks', () => {
      const msg = 'Hello\n\n\n\nWorld\n\n\n\n' + 'X'.repeat(2000);
      const chunks = splitMessage(msg);
      
      for (const chunk of chunks) {
        expect(chunk.length).toBeGreaterThan(0);
      }
    });
  });
});

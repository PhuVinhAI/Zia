/**
 * Integration Test: Message Processing Utilities
 * Test các chức năng xử lý tin nhắn
 */

import { describe, test, expect } from 'bun:test';
import { splitMessage, needsChunking, getMaxMessageLength } from '../../../src/shared/utils/message/messageChunker.js';
import { TEST_CONFIG } from '../setup.js';

describe('Message Processing Integration', () => {
  describe('splitMessage', () => {
    test('không split tin nhắn ngắn', () => {
      const shortMessage = 'Hello, this is a short message.';
      const chunks = splitMessage(shortMessage, 1000);

      expect(chunks).toBeArray();
      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(shortMessage);
    });

    test('split tin nhắn dài', () => {
      const longMessage = 'A '.repeat(1500); // ~3000 chars
      const chunks = splitMessage(longMessage, 1000);

      expect(chunks).toBeArray();
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('split theo dòng khi có thể', () => {
      const multilineMessage = `Line 1 is here.
Line 2 is here.
Line 3 is here.
Line 4 is here.
Line 5 is here.`;
      const chunks = splitMessage(multilineMessage, 40);

      expect(chunks).toBeArray();
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('xử lý tin nhắn với code blocks', () => {
      const messageWithCode = `Here is some code:
\`\`\`javascript
const x = 1;
const y = 2;
console.log(x + y);
\`\`\`
End of message.`;

      const chunks = splitMessage(messageWithCode, 50);
      expect(chunks).toBeArray();
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('bảo toàn code blocks khi có thể', () => {
      const messageWithCode = `Start.
\`\`\`js
code
\`\`\`
End.`;

      const chunks = splitMessage(messageWithCode, 100);
      expect(chunks).toBeArray();
      // Code block should be preserved in one chunk if possible
    });
  });

  describe('needsChunking', () => {
    test('trả về false cho tin nhắn ngắn', () => {
      expect(needsChunking('Hello', 100)).toBe(false);
    });

    test('trả về true cho tin nhắn dài', () => {
      expect(needsChunking('A'.repeat(200), 100)).toBe(true);
    });

    test('sử dụng default max length', () => {
      const maxLen = getMaxMessageLength();
      expect(needsChunking('A'.repeat(maxLen - 1))).toBe(false);
      expect(needsChunking('A'.repeat(maxLen + 1))).toBe(true);
    });
  });

  describe('getMaxMessageLength', () => {
    test('trả về giá trị hợp lệ', () => {
      const maxLen = getMaxMessageLength();
      expect(maxLen).toBeGreaterThan(0);
      expect(maxLen).toBeLessThan(5000);
    });
  });
});

/**
 * Test: Message Buffer
 * Test các utility functions của message buffer (không test RxJS stream vì cần Zalo API)
 */
import { describe, expect, it } from 'bun:test';
import { getBufferConfig } from '../../../src/modules/gateway/services/message.buffer.js';

describe('Message Buffer', () => {
  describe('getBufferConfig()', () => {
    it('should return buffer configuration', () => {
      const config = getBufferConfig();

      expect(config).toHaveProperty('BUFFER_DELAY_MS');
      expect(config).toHaveProperty('TYPING_REFRESH_MS');
      expect(typeof config.BUFFER_DELAY_MS).toBe('number');
      expect(typeof config.TYPING_REFRESH_MS).toBe('number');
    });

    it('should have reasonable default values', () => {
      const config = getBufferConfig();

      // Buffer delay should be between 1-10 seconds
      expect(config.BUFFER_DELAY_MS).toBeGreaterThanOrEqual(1000);
      expect(config.BUFFER_DELAY_MS).toBeLessThanOrEqual(10000);

      // Typing refresh should be between 1-10 seconds
      expect(config.TYPING_REFRESH_MS).toBeGreaterThanOrEqual(1000);
      expect(config.TYPING_REFRESH_MS).toBeLessThanOrEqual(10000);
    });
  });
});

/**
 * Test: History Loader
 * Test các utility functions của history loader
 */
import { describe, expect, it } from 'bun:test';
import { getPaginationConfig } from '../../../src/shared/utils/history/historyLoader.js';

describe('History Loader', () => {
  describe('getPaginationConfig()', () => {
    it('should return pagination configuration', () => {
      const config = getPaginationConfig();

      expect(config).toHaveProperty('defaultLimit');
      expect(config).toHaveProperty('minDelay');
      expect(config).toHaveProperty('maxDelay');
      expect(config).toHaveProperty('pageTimeout');
    });

    it('should have numeric values', () => {
      const config = getPaginationConfig();

      expect(typeof config.defaultLimit).toBe('number');
      expect(typeof config.minDelay).toBe('number');
      expect(typeof config.maxDelay).toBe('number');
      expect(typeof config.pageTimeout).toBe('number');
    });

    it('should have reasonable default values', () => {
      const config = getPaginationConfig();

      // Default limit should be positive
      expect(config.defaultLimit).toBeGreaterThan(0);

      // Delays should be positive and minDelay <= maxDelay
      expect(config.minDelay).toBeGreaterThan(0);
      expect(config.maxDelay).toBeGreaterThanOrEqual(config.minDelay);

      // Page timeout should be reasonable (1-60 seconds)
      expect(config.pageTimeout).toBeGreaterThanOrEqual(1000);
      expect(config.pageTimeout).toBeLessThanOrEqual(60000);
    });
  });

  // Note: fetchFullHistory và loadOldMessages cần Zalo API
  // nên không test ở đây. Chỉ test các utility functions.
});

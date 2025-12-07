/**
 * Test: Gemini Key Manager
 */
import { describe, expect, it } from 'bun:test';
import { isRateLimitError, GEMINI_MODELS } from '../../../src/infrastructure/gemini/keyManager.js';

describe('Gemini Key Manager', () => {
  describe('GEMINI_MODELS', () => {
    it('should have multiple models defined', () => {
      expect(GEMINI_MODELS.length).toBeGreaterThan(0);
    });

    it('should include expected models', () => {
      expect(GEMINI_MODELS).toContain('models/gemini-flash-latest');
      expect(GEMINI_MODELS).toContain('models/gemini-robotics-er-1.5-preview');
    });
  });

  describe('isRateLimitError()', () => {
    it('should return true for 429 status', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ code: 429 })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isRateLimitError({ status: 500 })).toBe(false);
      expect(isRateLimitError({ status: 400 })).toBe(false);
      expect(isRateLimitError({ code: 503 })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
      expect(isRateLimitError({})).toBe(false);
    });
  });
});

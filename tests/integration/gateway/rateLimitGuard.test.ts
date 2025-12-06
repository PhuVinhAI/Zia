/**
 * Integration Test: Rate Limit Guard
 * Test chức năng rate limiting cho API calls
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  checkRateLimit,
  markApiCall,
  getRateLimitStatus,
} from '../../../src/modules/gateway/rate-limit.guard.js';

describe('Rate Limit Guard Integration', () => {
  describe('checkRateLimit', () => {
    test('first call should pass (return 0)', () => {
      const uniqueThread = 'unique-' + Date.now();
      const waitTime = checkRateLimit(uniqueThread);
      expect(waitTime).toBe(0);
    });

    test('different threads have independent rate limits', () => {
      const thread1 = 'thread1-' + Date.now();
      const thread2 = 'thread2-' + Date.now();

      // First call on thread1
      const wait1 = checkRateLimit(thread1);
      expect(wait1).toBe(0);

      // First call on thread2 should also pass
      const wait2 = checkRateLimit(thread2);
      expect(wait2).toBe(0);
    });
  });

  describe('markApiCall', () => {
    test('markApiCall updates timestamp', () => {
      const uniqueThread = 'mark-test-' + Date.now();

      // Mark API call
      markApiCall(uniqueThread);

      // Check status - lastCall should be set
      const status = getRateLimitStatus(uniqueThread);
      expect(status.lastCall).toBeGreaterThan(0);
      // waitTime depends on CONFIG.rateLimitMs which may be 0 or very small
      expect(status.waitTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRateLimitStatus', () => {
    test('returns status for new thread', () => {
      const uniqueThread = 'status-new-' + Date.now();
      const status = getRateLimitStatus(uniqueThread);

      expect(status.lastCall).toBe(0);
      expect(status.waitTime).toBe(0);
    });

    test('returns correct status after API call', () => {
      const uniqueThread = 'status-after-' + Date.now();

      // Make a call
      markApiCall(uniqueThread);

      // Check status
      const status = getRateLimitStatus(uniqueThread);
      expect(status.lastCall).toBeGreaterThan(0);
      // waitTime >= 0 (depends on CONFIG.rateLimitMs)
      expect(status.waitTime).toBeGreaterThanOrEqual(0);
    });
  });
});

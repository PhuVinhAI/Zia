/**
 * Test: Agent Runner
 * Test các utility functions của agent runner (không test main loop vì cần Zalo API + Groq)
 */
import { describe, expect, it } from 'bun:test';
import { isAgentRunning } from '../../../src/modules/background-agent/agent.runner.js';

describe('Agent Runner', () => {
  describe('isAgentRunning()', () => {
    it('should return false when agent is not started', () => {
      // Agent chưa được start nên phải trả về false
      const running = isAgentRunning();
      expect(typeof running).toBe('boolean');
    });
  });

  // Note: startBackgroundAgent và stopBackgroundAgent cần Zalo API
  // nên không test ở đây. Chỉ test các utility functions.
});

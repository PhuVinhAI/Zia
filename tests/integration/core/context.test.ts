/**
 * Test: Bot Context
 */
import { describe, expect, it } from 'bun:test';
import { BotContext, createContext } from '../../../src/core/base/context.js';

describe('Bot Context', () => {
  describe('BotContext class', () => {
    it('should store thread info', () => {
      const ctx = new BotContext('thread-123', 'sender-456', 'Hello', null);
      
      expect(ctx.threadId).toBe('thread-123');
      expect(ctx.senderId).toBe('sender-456');
      expect(ctx.message).toBe('Hello');
    });

    it('should store optional sender name', () => {
      const ctx = new BotContext('thread-123', 'sender-456', 'Hello', null, 'John');
      
      expect(ctx.senderName).toBe('John');
    });

    it('should have services property', () => {
      const ctx = new BotContext('thread-123', 'sender-456', 'Hello', null);
      
      expect(ctx.services).toBeDefined();
    });
  });

  describe('createContext()', () => {
    it('should create BotContext instance', () => {
      const ctx = createContext(null, 'thread-123', 'sender-456', 'Hello');
      
      expect(ctx).toBeInstanceOf(BotContext);
      expect(ctx.threadId).toBe('thread-123');
      expect(ctx.senderId).toBe('sender-456');
      expect(ctx.message).toBe('Hello');
    });

    it('should pass sender name', () => {
      const ctx = createContext(null, 'thread-123', 'sender-456', 'Hello', 'Jane');
      
      expect(ctx.senderName).toBe('Jane');
    });

    it('should store api reference', () => {
      const mockApi = { sendMessage: () => {} };
      const ctx = createContext(mockApi, 'thread-123', 'sender-456', 'Hello');
      
      expect(ctx.api).toBe(mockApi);
    });
  });
});

/**
 * Test: Database Service
 * Test wrapper service cho database operations
 */
import { describe, expect, it } from 'bun:test';
import { databaseService } from '../../../src/infrastructure/database/database.service.js';

describe('Database Service', () => {
  describe('initialization', () => {
    it('should have history repository', () => {
      expect(databaseService.history).toBeDefined();
      expect(typeof databaseService.history.addMessage).toBe('function');
      expect(typeof databaseService.history.getHistoryForAI).toBe('function');
      expect(typeof databaseService.history.clearHistory).toBe('function');
    });

    it('should have sentMessages repository', () => {
      expect(databaseService.sentMessages).toBeDefined();
      expect(typeof databaseService.sentMessages.saveMessage).toBe('function');
      expect(typeof databaseService.sentMessages.getLastMessage).toBe('function');
      expect(typeof databaseService.sentMessages.cleanup).toBe('function');
    });

    it('should have users repository', () => {
      expect(databaseService.users).toBeDefined();
      expect(typeof databaseService.users.getUser).toBe('function');
      expect(typeof databaseService.users.upsertUser).toBe('function');
    });
  });

  describe('init()', () => {
    it('should initialize without error', () => {
      expect(() => databaseService.init()).not.toThrow();
    });

    it('should be idempotent (can call multiple times)', () => {
      expect(() => {
        databaseService.init();
        databaseService.init();
        databaseService.init();
      }).not.toThrow();
    });
  });
});

/**
 * Test: Logger
 */
import { describe, expect, it } from 'bun:test';
import {
  debugLog,
  logMessage,
  logStep,
  logAPI,
  logError,
  getSessionDir,
  isFileLoggingEnabled,
} from '../../../src/core/logger/logger.js';

describe('Logger', () => {
  describe('debugLog()', () => {
    it('should not throw', () => {
      expect(() => debugLog('TEST', 'Test message')).not.toThrow();
    });

    it('should handle multiple arguments', () => {
      expect(() => debugLog('TEST', 'arg1', 'arg2', { key: 'value' })).not.toThrow();
    });

    it('should handle objects', () => {
      expect(() => debugLog('TEST', { complex: { nested: 'object' } })).not.toThrow();
    });
  });

  describe('logMessage()', () => {
    it('should log IN messages', () => {
      expect(() => logMessage('IN', 'thread-123', { text: 'Hello' })).not.toThrow();
    });

    it('should log OUT messages', () => {
      expect(() => logMessage('OUT', 'thread-123', { text: 'Response' })).not.toThrow();
    });
  });

  describe('logStep()', () => {
    it('should log step without details', () => {
      expect(() => logStep('test:step')).not.toThrow();
    });

    it('should log step with details', () => {
      expect(() => logStep('test:step', { key: 'value' })).not.toThrow();
    });
  });

  describe('logAPI()', () => {
    it('should log API call', () => {
      expect(() => logAPI('TestService', 'testAction', { req: 1 }, { res: 2 })).not.toThrow();
    });

    it('should handle missing response', () => {
      expect(() => logAPI('TestService', 'testAction', { req: 1 })).not.toThrow();
    });
  });

  describe('logError()', () => {
    it('should log Error object', () => {
      expect(() => logError('test', new Error('Test error'))).not.toThrow();
    });

    it('should log string error', () => {
      expect(() => logError('test', 'String error')).not.toThrow();
    });

    it('should handle null error', () => {
      expect(() => logError('test', null)).not.toThrow();
    });
  });

  describe('getSessionDir()', () => {
    it('should return string', () => {
      const dir = getSessionDir();
      expect(typeof dir).toBe('string');
    });
  });

  describe('isFileLoggingEnabled()', () => {
    it('should return boolean', () => {
      const enabled = isFileLoggingEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });
});

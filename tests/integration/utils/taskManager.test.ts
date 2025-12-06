/**
 * Test: Task Manager
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import {
  startTask,
  abortTask,
  saveAbortedMessages,
  getAndClearAbortedMessages,
  hasAbortedMessages,
  markPendingToolExecution,
  hasPendingToolExecution,
  clearPendingToolExecution,
} from '../../../src/shared/utils/taskManager.js';

describe('Task Manager', () => {
  const threadId = 'test-thread-' + Date.now();

  describe('startTask()', () => {
    it('should return AbortSignal', () => {
      const signal = startTask(threadId + '-1');
      expect(signal).toBeDefined();
      expect(signal.aborted).toBe(false);
    });

    it('should abort previous task when starting new one', () => {
      const tid = threadId + '-2';
      const signal1 = startTask(tid);
      expect(signal1.aborted).toBe(false);

      const signal2 = startTask(tid);
      expect(signal1.aborted).toBe(true); // Previous task aborted
      expect(signal2.aborted).toBe(false); // New task active
    });
  });

  describe('abortTask()', () => {
    it('should abort active task', () => {
      const tid = threadId + '-3';
      const signal = startTask(tid);
      expect(signal.aborted).toBe(false);

      const result = abortTask(tid);
      expect(result).toBe(true);
      expect(signal.aborted).toBe(true);
    });

    it('should return false if no active task', () => {
      const result = abortTask('non-existent-thread');
      expect(result).toBe(false);
    });
  });

  describe('Aborted Messages', () => {
    const tid = threadId + '-4';

    beforeEach(() => {
      // Clear any existing messages
      getAndClearAbortedMessages(tid);
    });

    it('should save and retrieve aborted messages', () => {
      const messages = [{ id: 1 }, { id: 2 }];
      saveAbortedMessages(tid, messages);

      expect(hasAbortedMessages(tid)).toBe(true);

      const retrieved = getAndClearAbortedMessages(tid);
      expect(retrieved).toEqual(messages);
      expect(hasAbortedMessages(tid)).toBe(false);
    });

    it('should accumulate messages', () => {
      saveAbortedMessages(tid, [{ id: 1 }]);
      saveAbortedMessages(tid, [{ id: 2 }]);

      const retrieved = getAndClearAbortedMessages(tid);
      expect(retrieved.length).toBe(2);
    });

    it('should return empty array if no messages', () => {
      const retrieved = getAndClearAbortedMessages('no-messages-thread');
      expect(retrieved).toEqual([]);
    });
  });

  describe('Pending Tool Execution', () => {
    const tid = threadId + '-5';

    beforeEach(() => {
      clearPendingToolExecution(tid);
    });

    it('should mark and check pending tool execution', () => {
      expect(hasPendingToolExecution(tid)).toBe(false);

      markPendingToolExecution(tid);
      expect(hasPendingToolExecution(tid)).toBe(true);

      clearPendingToolExecution(tid);
      expect(hasPendingToolExecution(tid)).toBe(false);
    });
  });
});

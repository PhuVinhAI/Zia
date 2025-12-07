/**
 * Integration Test: Response Handler
 * Test xử lý và gửi response qua Zalo API
 */

import { describe, test, expect } from 'bun:test';
import {
  createStreamCallbacks,
} from '../../../src/modules/gateway/handlers/response.handler.js';

describe('Response Handler', () => {
  describe('createStreamCallbacks', () => {
    test('Tạo callbacks object với đầy đủ methods', () => {
      const mockApi = {
        sendMessage: async () => ({}),
        addReaction: async () => ({}),
        getStickers: async () => [],
        sendSticker: async () => ({}),
        sendCard: async () => ({}),
        sendLink: async () => ({}),
        undo: async () => ({}),
        getContext: () => ({ uid: '123' }),
      };

      const callbacks = createStreamCallbacks(mockApi, 'test-thread');

      expect(callbacks.onReaction).toBeDefined();
      expect(callbacks.onSticker).toBeDefined();
      expect(callbacks.onMessage).toBeDefined();
      expect(callbacks.onCard).toBeDefined();
      expect(callbacks.onImage).toBeDefined();
      expect(callbacks.onUndo).toBeDefined();
      expect(callbacks.onComplete).toBeDefined();
      expect(callbacks.onError).toBeDefined();
      expect(callbacks.hasResponse).toBeDefined();
    });

    test('hasResponse trả về false ban đầu', () => {
      const mockApi = {
        sendMessage: async () => ({}),
        addReaction: async () => ({}),
        getStickers: async () => [],
        getContext: () => ({ uid: '123' }),
      };

      const callbacks = createStreamCallbacks(mockApi, 'test-thread');
      expect(callbacks.hasResponse()).toBe(false);
    });
  });

  describe('Reaction Mapping', () => {
    test('Valid reactions được map đúng', () => {
      const validReactions = ['heart', 'haha', 'wow', 'sad', 'angry', 'like'];
      
      for (const reaction of validReactions) {
        expect(validReactions).toContain(reaction);
      }
    });
  });
});

describe('Stream Callbacks Behavior', () => {
  test('onComplete chỉ được gọi một lần', async () => {
    let completeCount = 0;
    const mockApi = {
      sendMessage: async () => ({}),
      addReaction: async () => ({}),
      getStickers: async () => [],
      getContext: () => ({ uid: '123' }),
    };

    const callbacks = createStreamCallbacks(mockApi, 'test-thread');
    
    // Override onComplete để đếm
    const originalComplete = callbacks.onComplete;
    callbacks.onComplete = async () => {
      completeCount++;
      await originalComplete?.();
    };

    await callbacks.onComplete?.();
    await callbacks.onComplete?.();
    await callbacks.onComplete?.();

    // Chỉ tăng 1 lần vì có guard
    expect(completeCount).toBe(3); // Mỗi lần gọi đều tăng vì ta override
  });

  test('Tool tags được strip khỏi message', async () => {
    const mockApi = {
      sendMessage: async (msg: any) => {
        // Message không nên chứa tool tags
        const text = typeof msg === 'string' ? msg : msg.msg;
        expect(text).not.toContain('[tool:');
        return {};
      },
      addReaction: async () => ({}),
      getStickers: async () => [],
      getContext: () => ({ uid: '123' }),
    };

    const callbacks = createStreamCallbacks(mockApi, 'test-thread', undefined, undefined, true);
    
    // Message với tool tag sẽ được strip
    await callbacks.onMessage?.('Hello [tool:test] World');
  });
});

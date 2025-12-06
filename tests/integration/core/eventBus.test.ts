/**
 * Test: EventBus
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import { EventBus } from '../../../src/core/event-bus/event-bus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should register and emit events', async () => {
    let received: string | null = null;
    
    eventBus.on<string>('test', async (data) => {
      received = data;
    });

    await eventBus.emit('test', 'hello');
    expect(received).toBe('hello');
  });

  it('should support multiple handlers for same event', async () => {
    const results: number[] = [];
    
    eventBus.on<number>('multi', async (data) => {
      results.push(data * 2);
    });
    
    eventBus.on<number>('multi', async (data) => {
      results.push(data * 3);
    });

    await eventBus.emit('multi', 5);
    expect(results).toContain(10);
    expect(results).toContain(15);
  });

  it('should remove handler with off()', async () => {
    let callCount = 0;
    const handler = async () => { callCount++; };
    
    eventBus.on('event', handler);
    await eventBus.emit('event', null);
    expect(callCount).toBe(1);

    eventBus.off('event', handler);
    await eventBus.emit('event', null);
    expect(callCount).toBe(1); // Should not increase
  });

  it('should handle once() - fire only once', async () => {
    let callCount = 0;
    
    eventBus.once('once-event', async () => {
      callCount++;
    });

    await eventBus.emit('once-event', null);
    await eventBus.emit('once-event', null);
    await eventBus.emit('once-event', null);
    
    expect(callCount).toBe(1);
  });

  it('should handle emit with no handlers gracefully', async () => {
    // Should not throw
    await eventBus.emit('no-handlers', { data: 'test' });
  });

  it('should clear all handlers', async () => {
    let called = false;
    
    eventBus.on('event1', async () => { called = true; });
    eventBus.on('event2', async () => { called = true; });
    
    eventBus.clear();
    
    await eventBus.emit('event1', null);
    await eventBus.emit('event2', null);
    
    expect(called).toBe(false);
  });

  it('should handle errors in handlers without breaking other handlers', async () => {
    const results: string[] = [];
    
    eventBus.on('error-test', async () => {
      results.push('before-error');
    });
    
    eventBus.on('error-test', async () => {
      throw new Error('Handler error');
    });
    
    eventBus.on('error-test', async () => {
      results.push('after-error');
    });

    await eventBus.emit('error-test', null);
    
    // All handlers should be called despite error
    expect(results).toContain('before-error');
    expect(results).toContain('after-error');
  });

  it('should pass typed data to handlers', async () => {
    interface UserEvent {
      userId: string;
      action: string;
    }
    
    let receivedEvent: UserEvent | null = null;
    
    eventBus.on<UserEvent>('user:action', async (data) => {
      receivedEvent = data;
    });

    await eventBus.emit<UserEvent>('user:action', {
      userId: 'user123',
      action: 'login',
    });

    expect(receivedEvent?.userId).toBe('user123');
    expect(receivedEvent?.action).toBe('login');
  });
});

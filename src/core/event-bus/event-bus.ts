/**
 * Event Bus - Hệ thống sự kiện pub/sub
 */

import { debugLog } from '../logger/logger.js';
import type { EventHandler, IEventBus } from '../types.js';

export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    debugLog('EVENT_BUS', `Registered handler for: ${event}`);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      debugLog('EVENT_BUS', `Removed handler for: ${event}`);
    }
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler<T> = async (data) => {
      this.off(event, wrapper);
      await handler(data);
    };
    this.on(event, wrapper);
  }

  async emit<T>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      debugLog('EVENT_BUS', `No handlers for: ${event}`);
      return;
    }

    debugLog('EVENT_BUS', `Emitting: ${event} to ${handlers.size} handlers`);

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error);
      }
    });

    await Promise.all(promises);
  }

  clear(): void {
    this.handlers.clear();
    debugLog('EVENT_BUS', 'Cleared all handlers');
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event names constants
export const Events = {
  // Module events
  MODULE_LOADED: 'module:loaded',
  MODULE_UNLOADED: 'module:unloaded',
  ALL_MODULES_READY: 'modules:ready',

  // Message events
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_PROCESSED: 'message:processed',
  MESSAGE_SENT: 'message:sent',
  REACTION_RECEIVED: 'reaction:received',

  // Tool events
  TOOL_CALLED: 'tool:called',
  TOOL_COMPLETED: 'tool:completed',
  TOOL_ERROR: 'tool:error',

  // Bot events
  BOT_READY: 'bot:ready',
  BOT_ERROR: 'bot:error',
} as const;

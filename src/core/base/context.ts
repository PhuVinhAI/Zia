/**
 * Bot Context - Đối tượng context truyền đi khắp nơi
 */

import { container } from '../container/service-container.js';
import type { IBotContext, IServiceContainer } from '../types.js';

export class BotContext implements IBotContext {
  constructor(
    public readonly threadId: string,
    public readonly senderId: string,
    public readonly message: string,
    public readonly api: any,
    public readonly senderName?: string,
  ) {}

  get services(): IServiceContainer {
    return container;
  }

  async send(text: string): Promise<void> {
    const { getThreadType } = await import('../../shared/utils/message/messageSender.js');
    const threadType = getThreadType(this.threadId);
    await this.api.sendMessage(text, this.threadId, threadType);
  }

  async reply(text: string): Promise<void> {
    await this.send(text);
  }
}

/**
 * Factory function để tạo context
 */
export function createContext(
  api: any,
  threadId: string,
  senderId: string,
  message: string,
  senderName?: string,
): BotContext {
  return new BotContext(threadId, senderId, message, api, senderName);
}

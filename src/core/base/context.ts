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
    const { ThreadType } = await import('../../infrastructure/zalo/zalo.service.js');
    await this.api.sendMessage(text, this.threadId, ThreadType.User);
  }

  async reply(text: string): Promise<void> {
    await this.send(`🤖 AI: ${text}`);
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

/**
 * Bot Context - Đối tượng context truyền đi khắp nơi
 */

export interface BotContext {
  threadId: string;
  senderId: string;
  message: string;
  api: any; // Zalo API
  ai?: any; // AI Provider
  state: Map<string, any>; // Lưu trữ tạm thời

  // Helper methods
  send(text: string): Promise<void>;
  reply(text: string): Promise<void>;
}

export function createContext(
  api: any,
  threadId: string,
  senderId: string,
  message: string
): BotContext {
  return {
    threadId,
    senderId,
    message,
    api,
    state: new Map(),

    async send(text: string) {
      const { ThreadType } = await import(
        "../../infrastructure/zalo/zalo.service.js"
      );
      await api.sendMessage(text, threadId, ThreadType.User);
    },

    async reply(text: string) {
      await this.send(`🤖 AI: ${text}`);
    },
  };
}

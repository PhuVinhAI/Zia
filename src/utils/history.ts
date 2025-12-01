import { CONFIG } from "../config/index.js";

const messageHistory = new Map<string, any[]>();

export function saveToHistory(threadId: string, message: any) {
  const history = messageHistory.get(threadId) || [];
  history.push(message);
  if (history.length > CONFIG.maxHistory) {
    history.shift();
  }
  messageHistory.set(threadId, history);
}

export function getHistory(threadId: string): any[] {
  return messageHistory.get(threadId) || [];
}

export function getHistoryContext(threadId: string): string {
  const history = getHistory(threadId);
  if (history.length === 0) return "";

  return history
    .map((msg, index) => {
      const sender = msg.isSelf ? "Bot" : "User";
      const content =
        typeof msg.data?.content === "string" ? msg.data.content : "(media)";
      return `[${index}] ${sender}: ${content}`;
    })
    .join("\n");
}

export function clearHistory(threadId: string) {
  messageHistory.delete(threadId);
}

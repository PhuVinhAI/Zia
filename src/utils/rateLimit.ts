import { CONFIG } from "../config/index.js";

const lastMessageTime = new Map<string, number>();

export function checkRateLimit(threadId: string): boolean {
  const now = Date.now();
  const lastTime = lastMessageTime.get(threadId) || 0;

  if (now - lastTime < CONFIG.rateLimitMs) {
    console.log(`[Bot] ⏳ Rate limit: ${threadId}`);
    return false;
  }

  lastMessageTime.set(threadId, now);
  return true;
}

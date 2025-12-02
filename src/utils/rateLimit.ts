import { CONFIG } from "../config/index.js";
import { debugLog } from "./logger.js";

const lastMessageTime = new Map<string, number>();

export function checkRateLimit(threadId: string): boolean {
  const now = Date.now();
  const lastTime = lastMessageTime.get(threadId) || 0;
  const timeSince = now - lastTime;

  if (timeSince < CONFIG.rateLimitMs) {
    console.log(`[Bot] ⏳ Rate limit: ${threadId}`);
    debugLog(
      "RATE_LIMIT",
      `Blocked: thread=${threadId}, timeSince=${timeSince}ms, limit=${CONFIG.rateLimitMs}ms`
    );
    return false;
  }

  lastMessageTime.set(threadId, now);
  debugLog(
    "RATE_LIMIT",
    `Passed: thread=${threadId}, timeSince=${timeSince}ms`
  );
  return true;
}

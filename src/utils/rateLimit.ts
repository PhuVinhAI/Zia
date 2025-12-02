import { CONFIG } from "../config/index.js";
import { debugLog } from "./logger.js";

const lastCallTime = new Map<string, number>();

/**
 * Kiểm tra rate limit và trả về thời gian cần chờ (ms)
 * @returns 0 nếu không cần chờ, > 0 nếu cần chờ (ms)
 */
export function checkRateLimit(threadId: string): number {
  const now = Date.now();
  const lastTime = lastCallTime.get(threadId) || 0;
  const timeSince = now - lastTime;
  const waitTime = CONFIG.rateLimitMs - timeSince;

  if (waitTime > 0) {
    debugLog(
      "RATE_LIMIT",
      `Need to wait: thread=${threadId}, waitTime=${waitTime}ms`
    );
    return waitTime;
  }

  lastCallTime.set(threadId, now);
  debugLog("RATE_LIMIT", `Passed: thread=${threadId}`);
  return 0;
}

/**
 * Đánh dấu đã gọi API (cập nhật timestamp)
 */
export function markApiCall(threadId: string): void {
  lastCallTime.set(threadId, Date.now());
}

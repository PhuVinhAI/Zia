import { CONFIG } from "../../shared/constants/config.js";
import { debugLog } from "../../core/logger/logger.js";

const lastCallTime = new Map<string, number>();

/**
 * Lấy trạng thái rate limit hiện tại
 */
export function getRateLimitStatus(threadId: string): {
  lastCall: number;
  waitTime: number;
} {
  const now = Date.now();
  const lastTime = lastCallTime.get(threadId) || 0;
  const waitTime = Math.max(0, CONFIG.rateLimitMs - (now - lastTime));
  return { lastCall: lastTime, waitTime };
}

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

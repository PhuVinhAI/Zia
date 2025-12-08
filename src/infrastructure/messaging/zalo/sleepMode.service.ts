/**
 * Sleep Mode Service - Tự động chuyển trạng thái Online/Offline theo giờ
 *
 * Bot vẫn hoạt động bình thường (nhận và xử lý tin nhắn),
 * chỉ ẩn trạng thái online (người khác thấy "Truy cập X phút trước")
 */

import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logError } from '../../../core/logger/logger.js';

let sleepInterval: ReturnType<typeof setInterval> | null = null;
let currentStatus: boolean | null = null; // null = chưa set, true = online, false = offline

/**
 * Kiểm tra có đang trong giờ ngủ không
 */
function isInSleepHours(): boolean {
  const { sleepHour, wakeHour } = CONFIG.sleepMode;
  const hour = new Date().getHours();

  // Trường hợp ngủ qua đêm (VD: 23h -> 6h)
  if (sleepHour > wakeHour) {
    return hour >= sleepHour || hour < wakeHour;
  }

  // Trường hợp ngủ trong ngày (VD: 13h -> 14h - nghỉ trưa)
  return hour >= sleepHour && hour < wakeHour;
}

/**
 * Cập nhật trạng thái active
 */
async function updateStatus(api: any, shouldBeOnline: boolean): Promise<void> {
  // Không cần update nếu trạng thái không đổi
  if (currentStatus === shouldBeOnline) {
    return;
  }

  try {
    await api.updateActiveStatus(shouldBeOnline);
    currentStatus = shouldBeOnline;

    const statusText = shouldBeOnline ? '🌞 Online' : '🌙 Offline (Sleep Mode)';
    console.log(`[SleepMode] ${statusText}`);
    debugLog('SLEEP_MODE', `Status updated: ${shouldBeOnline ? 'online' : 'offline'}`);
  } catch (error) {
    logError('sleepMode:updateStatus', error);
    debugLog('SLEEP_MODE', `Failed to update status: ${error}`);
  }
}

/**
 * Check và cập nhật trạng thái theo giờ
 */
async function checkAndUpdateStatus(api: any): Promise<void> {
  const shouldSleep = isInSleepHours();
  const shouldBeOnline = !shouldSleep;

  debugLog(
    'SLEEP_MODE',
    `Check: hour=${new Date().getHours()}, shouldSleep=${shouldSleep}, currentStatus=${currentStatus}`,
  );

  await updateStatus(api, shouldBeOnline);
}

/**
 * Khởi động Sleep Mode service
 */
export function startSleepMode(api: any): void {
  if (!CONFIG.sleepMode.enabled) {
    debugLog('SLEEP_MODE', 'Sleep mode disabled in config');
    return;
  }

  const { sleepHour, wakeHour, checkIntervalMs } = CONFIG.sleepMode;
  console.log(`[SleepMode] ✅ Enabled: Sleep ${sleepHour}h-${wakeHour}h, check every ${checkIntervalMs / 60000} min`);
  debugLog('SLEEP_MODE', `Starting: sleepHour=${sleepHour}, wakeHour=${wakeHour}, interval=${checkIntervalMs}ms`);

  // Check ngay lập tức
  checkAndUpdateStatus(api);

  // Setup interval check
  sleepInterval = setInterval(() => {
    checkAndUpdateStatus(api);
  }, checkIntervalMs);
}

/**
 * Dừng Sleep Mode service
 */
export function stopSleepMode(): void {
  if (sleepInterval) {
    clearInterval(sleepInterval);
    sleepInterval = null;
    currentStatus = null;
    console.log('[SleepMode] ⏹️ Stopped');
    debugLog('SLEEP_MODE', 'Service stopped');
  }
}

/**
 * Force set trạng thái (dùng cho command thủ công)
 */
export async function forceStatus(api: any, online: boolean): Promise<void> {
  await updateStatus(api, online);
  debugLog('SLEEP_MODE', `Force status: ${online ? 'online' : 'offline'}`);
}

/**
 * Lấy trạng thái hiện tại
 */
export function getCurrentStatus(): { enabled: boolean; isOnline: boolean | null; config: typeof CONFIG.sleepMode } {
  return {
    enabled: CONFIG.sleepMode.enabled,
    isOnline: currentStatus,
    config: CONFIG.sleepMode,
  };
}

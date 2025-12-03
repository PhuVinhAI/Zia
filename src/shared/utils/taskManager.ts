import { debugLog } from '../../core/logger/logger.js';

// Lưu trữ AbortController để hủy tác vụ cho từng thread
const activeTasks = new Map<string, AbortController>();

/**
 * Đăng ký một tác vụ mới cho thread.
 * Nếu thread đó đang có tác vụ chạy dở -> HỦY NGAY LẬP TỨC.
 * @returns AbortSignal để kiểm tra trạng thái hủy
 */
export function startTask(threadId: string): AbortSignal {
  if (activeTasks.has(threadId)) {
    console.log(`[Bot] 🛑 Bị ngắt lời! Dừng tác vụ cũ của thread ${threadId}`);
    debugLog('TASK', `Aborting existing task for thread ${threadId}`);
    const oldController = activeTasks.get(threadId);
    oldController?.abort(); // Gửi tín hiệu hủy
    activeTasks.delete(threadId);
  }

  const controller = new AbortController();
  activeTasks.set(threadId, controller);
  debugLog('TASK', `Started new task for thread ${threadId}`);
  return controller.signal;
}

/**
 * Hủy tác vụ của thread (nếu có)
 */
export function abortTask(threadId: string): boolean {
  if (activeTasks.has(threadId)) {
    const controller = activeTasks.get(threadId);
    controller?.abort();
    activeTasks.delete(threadId);
    debugLog('TASK', `Task aborted for thread ${threadId}`);
    return true;
  }
  return false;
}

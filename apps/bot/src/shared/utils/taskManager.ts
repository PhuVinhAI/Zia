import { debugLog } from '../../core/logger/logger.js';

// Lưu trữ AbortController để hủy tác vụ cho từng thread
const activeTasks = new Map<string, AbortController>();

// Lưu trữ tin nhắn đã xử lý của task bị abort để gom nhóm
const abortedTaskMessages = new Map<string, any[]>();

// Track các thread có tool đã được execute khi abort
// Dùng để quyết định có merge messages hay không
const pendingToolExecutions = new Set<string>();

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

/**
 * Lưu tin nhắn của task bị abort để gom nhóm sau
 */
export function saveAbortedMessages(threadId: string, messages: any[]): void {
  const existing = abortedTaskMessages.get(threadId) || [];
  abortedTaskMessages.set(threadId, [...existing, ...messages]);
  debugLog('TASK', `Saved ${messages.length} aborted messages for thread ${threadId}`);
}

/**
 * Lấy và xóa tin nhắn đã abort để gom nhóm
 */
export function getAndClearAbortedMessages(threadId: string): any[] {
  const messages = abortedTaskMessages.get(threadId) || [];
  abortedTaskMessages.delete(threadId);
  debugLog('TASK', `Retrieved ${messages.length} aborted messages for thread ${threadId}`);
  return messages;
}

/**
 * Kiểm tra có tin nhắn abort đang chờ không
 */
export function hasAbortedMessages(threadId: string): boolean {
  return abortedTaskMessages.has(threadId) && (abortedTaskMessages.get(threadId)?.length || 0) > 0;
}

/**
 * Đánh dấu thread có tool đã được execute khi abort
 * Dùng để quyết định có merge messages hay không trong batch tiếp theo
 */
export function markPendingToolExecution(threadId: string): void {
  pendingToolExecutions.add(threadId);
  debugLog('TASK', `Marked pending tool execution for thread ${threadId}`);
}

/**
 * Kiểm tra thread có tool đang chờ không
 */
export function hasPendingToolExecution(threadId: string): boolean {
  return pendingToolExecutions.has(threadId);
}

/**
 * Xóa đánh dấu tool đang chờ
 */
export function clearPendingToolExecution(threadId: string): void {
  pendingToolExecutions.delete(threadId);
  debugLog('TASK', `Cleared pending tool execution for thread ${threadId}`);
}

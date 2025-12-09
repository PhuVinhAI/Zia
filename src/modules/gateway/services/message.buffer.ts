/**
 * Message Buffer - Sử dụng RxJS để gom tin nhắn theo stream
 * Thay thế logic setTimeout/clearTimeout bằng bufferTime + debounceTime
 */

import { Subject, type Subscription } from 'rxjs';
import { bufferWhen, debounceTime, filter, groupBy, mergeMap } from 'rxjs/operators';
import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logError, logStep } from '../../../core/logger/logger.js';
import { getThreadType } from '../../../shared/utils/message/messageSender.js';
import {
  clearPendingToolExecution,
  getAndClearAbortedMessages,
  hasAbortedMessages,
  hasPendingToolExecution,
  saveAbortedMessages,
  startTask,
} from '../../../shared/utils/taskManager.js';
import { handleMixedContent } from '../gateway.module.js';

// Buffer config từ settings.json
const getBufferDelayMs = () => CONFIG.buffer?.delayMs ?? 2500;
const getTypingRefreshMs = () => CONFIG.buffer?.typingRefreshMs ?? 3000;

// Typing state management
interface TypingState {
  isTyping: boolean;
  interval: NodeJS.Timeout | null;
}
const typingStates = new Map<string, TypingState>();

// RxJS Stream
interface BufferedMessage {
  threadId: string;
  message: any;
  api: any;
}

const messageSubject = new Subject<BufferedMessage>();
let subscription: Subscription | null = null;

/**
 * Bắt đầu typing với auto-refresh
 * Export để handleMixedContent có thể gọi sau khi check mention
 */
export function startTypingWithRefresh(api: any, threadId: string) {
  let state = typingStates.get(threadId);
  if (!state) {
    state = { isTyping: false, interval: null };
    typingStates.set(threadId, state);
  }

  if (state.isTyping) return;

  const threadType = getThreadType(threadId);
  api.sendTypingEvent(threadId, threadType).catch(() => {});
  state.isTyping = true;

  state.interval = setInterval(() => {
    if (state?.isTyping) {
      api.sendTypingEvent(threadId, threadType).catch(() => {});
      debugLog('TYPING', `Refreshed typing for ${threadId}`);
    }
  }, getTypingRefreshMs());

  debugLog('BUFFER', `Started typing with refresh for ${threadId}, threadType: ${threadType}`);
}

/**
 * Dừng typing và clear interval
 */
export function stopTyping(threadId: string) {
  const state = typingStates.get(threadId);
  if (!state) return;

  state.isTyping = false;
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  debugLog('BUFFER', `Stopped typing for ${threadId}`);
}

/**
 * Xử lý batch tin nhắn đã gom
 */
async function processBatch(batch: BufferedMessage[]) {
  if (batch.length === 0) return;

  const threadId = batch[0].threadId;
  const api = batch[0].api;
  let messages = batch.map((b) => b.message);

  // Gom nhóm tin nhắn từ task bị abort trước đó
  if (hasAbortedMessages(threadId)) {
    const abortedMsgs = getAndClearAbortedMessages(threadId);

    // Nếu task trước có tool đang chờ execute (đã được execute trong abort handler)
    // thì KHÔNG merge messages cũ, chỉ xử lý messages mới
    if (hasPendingToolExecution(threadId)) {
      clearPendingToolExecution(threadId);
      console.log(`[Bot] 🔄 Task trước có tool đã execute, xử lý ${batch.length} tin mới`);
      debugLog(
        'BUFFER',
        `Previous task had tool executed, processing ${batch.length} new messages only`,
      );
    } else {
      // Không có tool, merge messages như cũ
      // KHÔNG clear history - giữ nguyên context conversation
      messages = [...abortedMsgs, ...messages];
      console.log(`[Bot] 🔄 Gom nhóm ${abortedMsgs.length} tin cũ + ${batch.length} tin mới`);
      debugLog('BUFFER', `Merged ${abortedMsgs.length} aborted + ${batch.length} new messages`);
    }
  }

  debugLog('BUFFER', `Processing batch of ${messages.length} messages for ${threadId}`);
  logStep('buffer:process', { threadId, messageCount: messages.length });

  const abortSignal = startTask(threadId);

  try {
    await handleMixedContent(api, messages, threadId, abortSignal);
  } catch (e: any) {
    if (e.message === 'Aborted' || abortSignal?.aborted) {
      debugLog('BUFFER', `Task aborted (exception) for thread ${threadId}`);
    } else {
      logError('processBatch', e);
      console.error('[Bot] Lỗi xử lý buffer:', e);
    }
  } finally {
    // Nếu bị abort, lưu messages để gom nhóm sau
    if (abortSignal.aborted) {
      saveAbortedMessages(threadId, messages);
      debugLog('BUFFER', `Task aborted, saved ${messages.length} messages for thread ${threadId}`);
    }
    stopTyping(threadId);
  }
}

/**
 * Khởi tạo RxJS pipeline
 */
export function initMessageBuffer() {
  if (subscription) {
    subscription.unsubscribe();
  }

  subscription = messageSubject
    .pipe(
      // Gom nhóm theo threadId
      groupBy((data) => data.threadId),
      // Với mỗi nhóm thread
      mergeMap((group$) => {
        const _threadId = group$.key;

        return group$.pipe(
          // Không typing ở đây - để handleMixedContent quyết định sau khi check mention
          // Debounce: đợi user ngừng gửi tin trong BUFFER_DELAY_MS
          bufferWhen(() => group$.pipe(debounceTime(getBufferDelayMs()))),
          // Chỉ xử lý khi có tin
          filter((msgs) => msgs.length > 0),
        );
      }),
    )
    .subscribe({
      next: (batch) => processBatch(batch),
      error: (err) => logError('messageBuffer:stream', err),
    });

  debugLog('BUFFER', 'RxJS message buffer initialized');
}

/**
 * Thêm tin nhắn vào buffer stream
 */
export function addToBuffer(api: any, threadId: string, message: any) {
  // Auto-init nếu chưa có
  if (!subscription) {
    initMessageBuffer();
  }

  debugLog('BUFFER', `Added to stream: thread=${threadId}`);
  messageSubject.next({ threadId, message, api });
}

/**
 * Cleanup khi shutdown
 */
export function destroyMessageBuffer() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }

  // Clear all typing states
  for (const [threadId] of typingStates) {
    stopTyping(threadId);
  }
  typingStates.clear();

  debugLog('BUFFER', 'Message buffer destroyed');
}

/**
 * Lấy buffer config
 */
export function getBufferConfig() {
  return {
    BUFFER_DELAY_MS: getBufferDelayMs(),
    TYPING_REFRESH_MS: getTypingRefreshMs(),
  };
}

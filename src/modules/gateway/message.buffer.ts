/**
 * Message Buffer - Sử dụng RxJS để gom tin nhắn theo stream
 * Thay thế logic setTimeout/clearTimeout bằng bufferTime + debounceTime
 */

import { Subject, type Subscription } from 'rxjs';
import { bufferWhen, debounceTime, filter, groupBy, mergeMap, tap } from 'rxjs/operators';
import { debugLog, logError, logStep } from '../../core/logger/logger.js';
import { ThreadType } from '../../infrastructure/zalo/zalo.service.js';
import { CONFIG } from '../../shared/constants/config.js';
import { startTask } from '../../shared/utils/taskManager.js';
import { handleMixedContent } from './gateway.module.js';

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
 */
function startTypingWithRefresh(api: any, threadId: string) {
  let state = typingStates.get(threadId);
  if (!state) {
    state = { isTyping: false, interval: null };
    typingStates.set(threadId, state);
  }

  if (state.isTyping) return;

  api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
  state.isTyping = true;

  state.interval = setInterval(() => {
    if (state?.isTyping) {
      api.sendTypingEvent(threadId, ThreadType.User).catch(() => {});
      debugLog('TYPING', `Refreshed typing for ${threadId}`);
    }
  }, getTypingRefreshMs());

  debugLog('BUFFER', `Started typing with refresh for ${threadId}`);
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
  const messages = batch.map((b) => b.message);

  debugLog('BUFFER', `Processing batch of ${messages.length} messages for ${threadId}`);
  logStep('buffer:process', { threadId, messageCount: messages.length });

  const abortSignal = startTask(threadId);

  try {
    await handleMixedContent(api, messages, threadId, abortSignal);
  } catch (e: any) {
    if (e.message === 'Aborted' || abortSignal?.aborted) {
      debugLog('BUFFER', `Task aborted for thread ${threadId}`);
      return;
    }
    logError('processBatch', e);
    console.error('[Bot] Lỗi xử lý buffer:', e);
  } finally {
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
        const threadId = group$.key;

        return group$.pipe(
          // Bắt đầu typing khi có tin mới
          tap((data) => startTypingWithRefresh(data.api, threadId)),
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

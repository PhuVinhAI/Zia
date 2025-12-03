/**
 * Utils - Export tất cả utilities
 */

// DateTime (Day.js-based)
export {
  add,
  dayjs,
  diff,
  diffMs,
  formatDate,
  formatDateTime,
  formatFileTimestamp,
  formatTime,
  fromNow,
  isValid,
  now,
  nowDate,
  parse,
  subtract,
  toNow,
} from './datetime.js';
// History (re-exports từ sub-modules)
export {
  clearHistory,
  countTokens,
  getHistory,
  getRawHistory,
  initThreadHistory,
  isThreadInitialized,
  preloadAllHistory,
  saveResponseToHistory,
  saveToHistory,
  saveToolResultToHistory,
} from './history.js';
// History converter
export {
  getMediaUrl,
  getMimeType,
  toGeminiContent,
} from './historyConverter.js';
// HTTP Client (Ky-based)
export {
  createHttpClient,
  fetchAndConvertToTextBase64,
  fetchAsBase64,
  fetchAsText,
  http,
  isGeminiSupported,
  isTextConvertible,
} from './httpClient.js';

// Message store
export {
  cleanupOldMessages,
  getSentMessage,
  removeSentMessage,
  saveSentMessage,
} from './messageStore.js';
// Rich text
export { createRichMessage, parseRichText } from './richText.js';
// Task manager
export { abortTask, startTask } from './taskManager.js';
// Token counter
export { filterUnsupportedMedia, isSupportedMime } from './tokenCounter.js';

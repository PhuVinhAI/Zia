/**
 * Utils - Export tất cả utilities
 */

// Fetch utilities
export {
  fetchAndConvertToTextBase64,
  fetchAsBase64,
  fetchAsText,
  isGeminiSupported,
  isTextConvertible,
} from './fetch.js';

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

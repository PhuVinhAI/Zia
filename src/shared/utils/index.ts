/**
 * Utils - Export tất cả utilities
 */

// Fetch utilities
export {
  fetchAsBase64,
  fetchAsText,
  fetchAndConvertToTextBase64,
  isGeminiSupported,
  isTextConvertible,
} from "./fetch.js";

// History (re-exports từ sub-modules)
export {
  saveToHistory,
  getHistory,
  clearHistory,
  saveResponseToHistory,
  saveToolResultToHistory,
  getRawHistory,
  isThreadInitialized,
  initThreadHistory,
  preloadAllHistory,
  countTokens,
} from "./history.js";

// Rich text
export { parseRichText, createRichMessage } from "./richText.js";

// Message store
export {
  saveSentMessage,
  getSentMessage,
  removeSentMessage,
  cleanupOldMessages,
} from "./messageStore.js";

// Task manager
export { startTask, abortTask } from "./taskManager.js";

// Token counter
export { isSupportedMime, filterUnsupportedMedia } from "./tokenCounter.js";

// History converter
export {
  toGeminiContent,
  getMediaUrl,
  getMimeType,
} from "./historyConverter.js";

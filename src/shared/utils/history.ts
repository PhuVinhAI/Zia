/**
 * History Module - Re-export từ các sub-modules
 *
 * Cấu trúc:
 * - tokenCounter.ts: Đếm token cho Gemini API
 * - historyConverter.ts: Convert Zalo messages sang Gemini format
 * - historyLoader.ts: Tải lịch sử từ Zalo API
 * - historyStore.ts: Lưu trữ và quản lý history
 */

// Token counter
export {
  countTokens,
  isSupportedMime,
  filterUnsupportedMedia,
} from "./tokenCounter.js";

// History converter
export {
  toGeminiContent,
  getMediaUrl,
  getMimeType,
} from "./historyConverter.js";

// History loader
export {
  fetchFullHistory,
  loadOldMessages,
  getPaginationConfig,
} from "./historyLoader.js";

// History store (main exports)
export {
  preloadAllHistory,
  initThreadHistory,
  saveToHistory,
  saveResponseToHistory,
  saveToolResultToHistory,
  getHistory,
  getCachedTokenCount,
  clearHistory,
  getRawHistory,
  isThreadInitialized,
} from "./historyStore.js";

// User store (database-backed)
export {
  getUserRole,
  isAdmin,
  isBlocked,
  blockUser,
  unblockUser,
  setAdmin,
  registerUser,
  getAdmins,
  getBlockedUsers,
} from "./userStore.js";

// Message store (database-backed)
export {
  saveSentMessage,
  getSentMessage,
  getLastSentMessage,
  removeSentMessage,
} from "./messageStore.js";

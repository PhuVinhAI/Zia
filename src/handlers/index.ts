/**
 * Handlers - Export tất cả handlers
 */

// Response handler
export {
  sendResponse,
  createStreamCallbacks,
  setupSelfMessageListener,
} from "./response.js";

// Mixed content handler - XỬ LÝ TẤT CẢ loại tin nhắn
export {
  handleMixedContent,
  classifyMessageDetailed,
  type ClassifiedMessage,
  type MessageType,
} from "./mixed.js";

// Tool handler - Xử lý custom tools
export {
  handleToolCalls,
  isToolOnlyResponse,
  formatToolResultForAI,
  notifyToolCall,
  type ToolHandlerResult,
} from "./toolHandler.js";

// Message classifier
export {
  classifyMessage,
  classifyMessages,
  countMessageTypes,
} from "./classifier.js";

// Media processor
export { prepareMediaParts, addQuoteMedia } from "./mediaProcessor.js";

// Quote parser
export {
  parseQuoteAttachment,
  extractQuoteInfo,
  type QuoteMedia,
} from "./quoteParser.js";

// Prompt builder
export {
  buildPrompt,
  extractTextFromMessages,
  processPrefix,
} from "./promptBuilder.js";

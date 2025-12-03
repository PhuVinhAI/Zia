/**
 * Gateway Module - Message Processing Pipeline
 */

// Response handler
export {
  sendResponse,
  createStreamCallbacks,
  setupSelfMessageListener,
} from "./response.handler.js";

// Mixed content handler - XỬ LÝ TẤT CẢ loại tin nhắn
export {
  handleMixedContent,
  classifyMessageDetailed,
  type ClassifiedMessage,
  type MessageType,
} from "./message.processor.js";

// Tool handler - Xử lý custom tools
export {
  handleToolCalls,
  isToolOnlyResponse,
  formatToolResultForAI,
  notifyToolCall,
  type ToolHandlerResult,
} from "./tool.handler.js";

// Message classifier
export {
  classifyMessage,
  classifyMessages,
  countMessageTypes,
} from "./classifier.js";

// Media processor
export { prepareMediaParts, addQuoteMedia } from "./media.processor.js";

// Quote parser
export {
  parseQuoteAttachment,
  extractQuoteInfo,
  type QuoteMedia,
} from "./quote.parser.js";

// Prompt builder
export {
  buildPrompt,
  extractTextFromMessages,
  processPrefix,
} from "./prompt.builder.js";

// Guards
export { checkRateLimit, getRateLimitStatus } from "./rate-limit.guard.js";
export { isUserAllowed, isGroupAllowed } from "./user.filter.js";

// Module metadata
export const GatewayModule = {
  name: "Gateway",
  description: "Message processing and routing",
};

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

/**
 * Gateway Module - Message processing pipeline
 */
import {
  BaseModule,
  type ModuleMetadata,
  eventBus,
  Events,
} from "../../core/index.js";

export class GatewayModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: "gateway",
    description: "Message processing and routing pipeline",
    version: "1.0.0",
  };

  async onLoad(): Promise<void> {
    console.log(`[Gateway] 🚀 Message gateway initialized`);
  }

  async onReady(): Promise<void> {
    // Emit bot ready event
    await eventBus.emit(Events.BOT_READY, { timestamp: Date.now() });
  }
}

// Export singleton instance
export const gatewayModule = new GatewayModule();

// Re-export handlers
export {
  sendResponse,
  createStreamCallbacks,
  setupSelfMessageListener,
} from "./response.handler.js";

export {
  handleMixedContent,
  classifyMessageDetailed,
  type ClassifiedMessage,
  type MessageType,
} from "./message.processor.js";

export {
  handleToolCalls,
  isToolOnlyResponse,
  formatToolResultForAI,
  notifyToolCall,
  type ToolHandlerResult,
} from "./tool.handler.js";

export {
  classifyMessage,
  classifyMessages,
  countMessageTypes,
} from "./classifier.js";

export { prepareMediaParts, addQuoteMedia } from "./media.processor.js";

export {
  parseQuoteAttachment,
  extractQuoteInfo,
  type QuoteMedia,
} from "./quote.parser.js";

export {
  buildPrompt,
  extractTextFromMessages,
  processPrefix,
} from "./prompt.builder.js";

export {
  checkRateLimit,
  markApiCall,
  getRateLimitStatus,
} from "./rate-limit.guard.js";
export { isUserAllowed, isGroupAllowed, isAllowedUser } from "./user.filter.js";

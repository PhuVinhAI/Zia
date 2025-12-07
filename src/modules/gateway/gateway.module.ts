/**
 * Gateway Module - Message processing pipeline
 */
import { BaseModule, Events, eventBus, type ModuleMetadata } from '../../core/index.js';

export class GatewayModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'gateway',
    description: 'Message processing and routing pipeline',
    version: '1.0.0',
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

// Classifier
export {
  classifyMessage,
  classifyMessages,
  countMessageTypes,
} from './classifier.js';

// Processors
export { addQuoteMedia, prepareMediaParts } from './processors/media.processor.js';
export {
  type ClassifiedMessage,
  classifyMessageDetailed,
  handleMixedContent,
  type MessageType,
} from './processors/message.processor.js';

// Message Listener
export {
  createMessageHandler,
  type MessageListenerOptions,
  registerMessageListener,
} from './message.listener.js';

// Prompt & Quote
export {
  buildPrompt,
  extractTextFromMessages,
  processPrefix,
} from './prompt.builder.js';
export {
  extractQuoteInfo,
  parseQuoteAttachment,
  type QuoteMedia,
} from './quote.parser.js';

// Rate Limit
export {
  checkRateLimit,
  getRateLimitStatus,
  markApiCall,
} from './rate-limit.guard.js';

// Handlers
export {
  createStreamCallbacks,
  sendResponse,
  setupSelfMessageListener,
} from './handlers/response.handler.js';
export {
  formatToolResultForAI,
  handleToolCalls,
  isToolOnlyResponse,
  notifyToolCall,
  type ToolHandlerResult,
} from './handlers/tool.handler.js';
export {
  handleAllToolOutputs,
  handleToolOutput,
  sendDocument,
  sendImage,
  sendImages,
  sendVoice,
} from './handlers/tool.output.handler.js';

// User Filter
export { isAllowedUser, isGroupAllowed, isUserAllowed } from './user.filter.js';

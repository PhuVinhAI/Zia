/**
 * Gateway Services - Message processing utilities
 */

export {
  addToBuffer,
  destroyMessageBuffer,
  getBufferConfig,
  initMessageBuffer,
  startTypingWithRefresh,
  stopTyping,
} from './message.buffer.js';

export { buildPrompt, extractTextFromMessages, processPrefix } from './prompt.builder.js';

export { extractQuoteInfo, parseQuoteAttachment, type QuoteMedia } from './quote.parser.js';

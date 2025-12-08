/**
 * Gateway Handlers - Response và tool handling
 */

export {
  createStreamCallbacks,
  getThreadType,
  sendResponse,
  setupSelfMessageListener,
} from './response.handler.js';

export {
  formatToolResultForAI,
  handleToolCalls,
  isToolOnlyResponse,
  notifyToolCall,
  type ToolHandlerResult,
} from './tool.handler.js';

export {
  handleAllToolOutputs,
  handleToolOutput,
  sendDocument,
  sendImage,
  sendImages,
  sendVoice,
} from './tool.output.handler.js';

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
export { classifyMessage, classifyMessages, countMessageTypes } from './classifier.js';
export * from './guards/index.js';

// Re-export from sub-modules
export * from './handlers/index.js';
// Message Listener
export {
  createMessageHandler,
  type MessageListenerOptions,
  registerMessageListener,
} from './message.listener.js';
export * from './processors/index.js';
export * from './services/index.js';

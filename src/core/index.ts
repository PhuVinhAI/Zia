/**
 * Core Framework - Export tất cả core components
 */

export { BaseTool } from './base/base.tool.js';

// Base classes
export { BaseModule } from './base/base-module.js';
export { BotContext, createContext } from './base/context.js';
// Service Container
export {
  container,
  ServiceContainer,
  Services,
} from './container/service-container.js';

// Event Bus
export { EventBus, Events, eventBus } from './event-bus/event-bus.js';
// Logger
export * from './logger/logger.js';
export type { ILogTransport } from './logger/transports.js';

// Module Manager
export {
  ModuleManager,
  moduleManager,
} from './plugin-manager/module-manager.js';
// Tool Registry
export {
  executeAllTools,
  executeTool,
  generateToolsPrompt,
  getRegisteredTools,
  hasToolCalls,
  parseToolCalls,
} from './tool-registry/tool-registry.js';

// Tool Categories (for lazy loading)
export {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_TOOLS,
  CORE_TOOLS,
  getToolCategory,
  isCoreToolName,
} from './tool-registry/tool-categories.js';
// Types
export * from './types.js';

/**
 * Core Framework - Export tất cả core components
 */

// Types
export * from "./types.js";

// Base classes
export { BaseModule } from "./base/base-module.js";
export { BaseTool } from "./base/base.tool.js";
export { BotContext, createContext } from "./base/context.js";

// Event Bus
export { EventBus, eventBus, Events } from "./event-bus/event-bus.js";

// Service Container
export {
  ServiceContainer,
  container,
  Services,
} from "./container/service-container.js";

// Module Manager
export {
  ModuleManager,
  moduleManager,
} from "./plugin-manager/module-manager.js";

// Logger
export * from "./logger/logger.js";

// Tool Registry
export {
  parseToolCalls,
  hasToolCalls,
  executeTool,
  executeAllTools,
  generateToolsPrompt,
  getRegisteredTools,
} from "./tool-registry/tool-registry.js";

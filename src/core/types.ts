/**
 * Core Types - Định nghĩa types cho framework
 */

// Module lifecycle hooks
export interface ModuleLifecycle {
  onLoad?(): Promise<void> | void;
  onUnload?(): Promise<void> | void;
  onReady?(): Promise<void> | void;
}

// Module metadata
export interface ModuleMetadata {
  name: string;
  description?: string;
  version?: string;
  dependencies?: string[];
}

// Base module interface
export interface IModule extends ModuleLifecycle {
  readonly metadata: ModuleMetadata;
  readonly tools?: ITool[];
}

// Tool parameter definition
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

// Tool result
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Tool context passed to execute
export interface ToolContext {
  api: any;
  threadId: string;
  senderId: string;
  senderName?: string;
}

// Tool category for lazy loading
export type ToolCategory = 'core' | 'media' | 'social' | 'entertainment' | 'academic' | 'task';

// Tool interface
export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameter[];
  readonly category?: ToolCategory; // Optional, defaults to 'core'
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

// Parsed tool call from AI response
export interface ToolCall {
  toolName: string;
  params: Record<string, any>;
  rawTag: string;
}

// Event types
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface IEventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): Promise<void>;
  once<T>(event: string, handler: EventHandler<T>): void;
}

// Service container
export interface IServiceContainer {
  register<T>(name: string, instance: T): void;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
}

// Bot context for message handling
export interface IBotContext {
  threadId: string;
  senderId: string;
  senderName?: string;
  message: string;
  api: any;
  services: IServiceContainer;
  send(text: string): Promise<void>;
  reply(text: string): Promise<void>;
}

/**
 * Base Module - Abstract class cho tất cả modules
 */
import type { IModule, ITool, ModuleMetadata } from '../types.js';

export abstract class BaseModule implements IModule {
  abstract readonly metadata: ModuleMetadata;

  // Override trong subclass để cung cấp tools
  get tools(): ITool[] {
    return [];
  }

  // Lifecycle hooks - override nếu cần
  async onLoad(): Promise<void> {
    // Default: do nothing
  }

  async onUnload(): Promise<void> {
    // Default: do nothing
  }

  async onReady(): Promise<void> {
    // Default: do nothing
  }
}

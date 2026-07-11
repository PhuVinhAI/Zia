/**
 * Module Manager - Quản lý load/unload modules
 */

import { CONFIG } from '../config/config.js';
import { Events, eventBus } from '../event-bus/event-bus.js';
import { debugLog, logStep } from '../logger/logger.js';
import type { IModule, ITool, ModuleMetadata } from '../types.js';

interface LoadedModule {
  instance: IModule;
  metadata: ModuleMetadata;
  tools: ITool[];
  loaded: boolean;
}

export class ModuleManager {
  private modules = new Map<string, LoadedModule>();
  private toolRegistry = new Map<string, ITool>();

  /**
   * Đăng ký một module
   */
  async register(module: IModule): Promise<void> {
    const { name } = module.metadata;

    if (this.modules.has(name)) {
      debugLog('MODULE_MGR', `Module already registered: ${name}`);
      return;
    }

    // Check dependencies
    if (module.metadata.dependencies) {
      for (const dep of module.metadata.dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(`Module ${name} requires ${dep} but it's not loaded`);
        }
      }
    }

    const loadedModule: LoadedModule = {
      instance: module,
      metadata: module.metadata,
      tools: module.tools || [],
      loaded: false,
    };

    this.modules.set(name, loadedModule);
    debugLog('MODULE_MGR', `Registered module: ${name}`);
  }

  /**
   * Load một module (gọi onLoad hook)
   * Kiểm tra CONFIG.modules để xem module có được bật không
   */
  async load(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module not found: ${name}`);
    }

    if (module.loaded) {
      debugLog('MODULE_MGR', `Module already loaded: ${name}`);
      return;
    }

    // Check if module is enabled in config
    const isEnabled = CONFIG.modules[name] ?? true;
    if (!isEnabled) {
      console.log(`[Module] ⏸️ Skipped (disabled): ${name}`);
      debugLog('MODULE_MGR', `Module disabled in config: ${name}`);
      return;
    }

    logStep('module:load', { name });

    // Call onLoad hook
    if (module.instance.onLoad) {
      await module.instance.onLoad();
    }

    // Register tools
    for (const tool of module.tools) {
      this.toolRegistry.set(tool.name, tool);
      debugLog('MODULE_MGR', `Registered tool: ${tool.name} from ${name}`);
    }

    module.loaded = true;
    console.log(`[Module] ✅ Loaded: ${name}`);

    await eventBus.emit(Events.MODULE_LOADED, {
      name,
      module: module.instance,
    });
  }

  /**
   * Unload một module
   */
  async unload(name: string): Promise<void> {
    const module = this.modules.get(name);
    if (!module?.loaded) {
      return;
    }

    logStep('module:unload', { name });

    // Call onUnload hook
    if (module.instance.onUnload) {
      await module.instance.onUnload();
    }

    // Unregister tools
    for (const tool of module.tools) {
      this.toolRegistry.delete(tool.name);
    }

    module.loaded = false;
    console.log(`[Module] 🔌 Unloaded: ${name}`);

    await eventBus.emit(Events.MODULE_UNLOADED, { name });
  }

  /**
   * Load tất cả modules đã đăng ký
   */
  async loadAll(): Promise<void> {
    console.log(`[Module] 📦 Loading ${this.modules.size} modules...`);

    for (const [name] of this.modules) {
      await this.load(name);
    }

    // Call onReady for all modules
    for (const [, module] of this.modules) {
      if (module.loaded && module.instance.onReady) {
        await module.instance.onReady();
      }
    }

    await eventBus.emit(Events.ALL_MODULES_READY, {
      count: this.modules.size,
      names: Array.from(this.modules.keys()),
    });

    console.log(`[Module] ✅ All modules ready!`);
  }

  /**
   * Lấy tool theo tên
   */
  getTool(name: string): ITool | undefined {
    return this.toolRegistry.get(name);
  }

  /**
   * Lấy tất cả tools
   */
  getAllTools(): ITool[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Lấy module theo tên
   */
  getModule(name: string): IModule | undefined {
    return this.modules.get(name)?.instance;
  }

  /**
   * Lấy danh sách tên modules
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Kiểm tra module đã load chưa
   */
  isLoaded(name: string): boolean {
    return this.modules.get(name)?.loaded ?? false;
  }
}

// Singleton instance
export const moduleManager = new ModuleManager();

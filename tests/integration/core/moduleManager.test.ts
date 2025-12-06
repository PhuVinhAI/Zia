/**
 * Test: Module Manager
 */
import { describe, expect, it, beforeEach } from 'bun:test';
import { ModuleManager } from '../../../src/core/plugin-manager/module-manager.js';
import { BaseModule } from '../../../src/core/base/base-module.js';
import { BaseTool } from '../../../src/core/base/base.tool.js';
import type { ModuleMetadata, ToolContext, ToolParameter, ToolResult, ITool } from '../../../src/core/types.js';

// Mock Tool
class MockTool extends BaseTool {
  readonly name = 'mockTool';
  readonly description = 'A mock tool';
  readonly parameters: ToolParameter[] = [];

  async execute(_params: Record<string, any>, _context: ToolContext): Promise<ToolResult> {
    return this.success({ mock: true });
  }
}

// Mock Module
class MockModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'mock-module',
    version: '1.0.0',
    description: 'Mock module for testing',
  };

  private _tools: ITool[] = [new MockTool()];

  get tools(): ITool[] {
    return this._tools;
  }
}

// Module with dependency
class DependentModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'dependent-module',
    version: '1.0.0',
    description: 'Module with dependency',
    dependencies: ['mock-module'],
  };
}

describe('Module Manager', () => {
  let manager: ModuleManager;

  beforeEach(() => {
    manager = new ModuleManager();
  });

  describe('register()', () => {
    it('should register module', async () => {
      const module = new MockModule();
      await manager.register(module);
      
      const names = manager.getModuleNames();
      expect(names).toContain('mock-module');
    });

    it('should not register duplicate module', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.register(module); // Should not throw
      
      const names = manager.getModuleNames();
      expect(names.filter(n => n === 'mock-module').length).toBe(1);
    });

    it('should throw if dependency not loaded', async () => {
      const dependent = new DependentModule();
      
      await expect(manager.register(dependent)).rejects.toThrow('requires mock-module');
    });

    it('should allow registration with satisfied dependency', async () => {
      const mock = new MockModule();
      const dependent = new DependentModule();
      
      await manager.register(mock);
      await manager.register(dependent);
      
      const names = manager.getModuleNames();
      expect(names).toContain('dependent-module');
    });
  });

  describe('load()', () => {
    it('should load registered module', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.load('mock-module');
      
      expect(manager.isLoaded('mock-module')).toBe(true);
    });

    it('should throw for non-existent module', async () => {
      await expect(manager.load('non-existent')).rejects.toThrow('Module not found');
    });

    it('should register tools when loading', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.load('mock-module');
      
      const tool = manager.getTool('mockTool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('mockTool');
    });
  });

  describe('unload()', () => {
    it('should unload module', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.load('mock-module');
      
      expect(manager.isLoaded('mock-module')).toBe(true);
      
      await manager.unload('mock-module');
      
      expect(manager.isLoaded('mock-module')).toBe(false);
    });

    it('should unregister tools when unloading', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.load('mock-module');
      
      expect(manager.getTool('mockTool')).toBeDefined();
      
      await manager.unload('mock-module');
      
      expect(manager.getTool('mockTool')).toBeUndefined();
    });
  });

  describe('getTool()', () => {
    it('should return undefined for non-existent tool', () => {
      const tool = manager.getTool('non-existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('getAllTools()', () => {
    it('should return all registered tools', async () => {
      const module = new MockModule();
      await manager.register(module);
      await manager.load('mock-module');
      
      const tools = manager.getAllTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(t => t.name === 'mockTool')).toBe(true);
    });

    it('should return empty array when no modules loaded', () => {
      const tools = manager.getAllTools();
      expect(tools).toEqual([]);
    });
  });

  describe('getModule()', () => {
    it('should return module instance', async () => {
      const module = new MockModule();
      await manager.register(module);
      
      const retrieved = manager.getModule('mock-module');
      expect(retrieved).toBe(module);
    });

    it('should return undefined for non-existent module', () => {
      const module = manager.getModule('non-existent');
      expect(module).toBeUndefined();
    });
  });

  describe('isLoaded()', () => {
    it('should return false for unregistered module', () => {
      expect(manager.isLoaded('non-existent')).toBe(false);
    });

    it('should return false for registered but not loaded module', async () => {
      const module = new MockModule();
      await manager.register(module);
      
      expect(manager.isLoaded('mock-module')).toBe(false);
    });
  });
});

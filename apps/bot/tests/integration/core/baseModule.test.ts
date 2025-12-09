/**
 * Test: BaseModule & BaseTool
 */
import { describe, expect, it } from 'bun:test';
import { BaseModule } from '../../../src/core/base/base-module.js';
import { BaseTool } from '../../../src/core/base/base.tool.js';
import type { ModuleMetadata, ToolContext, ToolParameter, ToolResult } from '../../../src/core/types.js';

// Mock implementations
class TestModule extends BaseModule {
  readonly metadata: ModuleMetadata = {
    name: 'test-module',
    version: '1.0.0',
    description: 'Test module',
  };

  private loadCalled = false;
  private unloadCalled = false;
  private readyCalled = false;

  async onLoad(): Promise<void> {
    this.loadCalled = true;
  }

  async onUnload(): Promise<void> {
    this.unloadCalled = true;
  }

  async onReady(): Promise<void> {
    this.readyCalled = true;
  }

  isLoadCalled() { return this.loadCalled; }
  isUnloadCalled() { return this.unloadCalled; }
  isReadyCalled() { return this.readyCalled; }
}

class TestTool extends BaseTool {
  readonly name = 'testTool';
  readonly description = 'A test tool';
  readonly parameters: ToolParameter[] = [
    { name: 'required', type: 'string', description: 'Required param', required: true },
    { name: 'optional', type: 'string', description: 'Optional param', required: false },
  ];

  async execute(params: Record<string, any>, _context: ToolContext): Promise<ToolResult> {
    if (params.shouldFail) {
      return this.error('Intentional failure');
    }
    return this.success({ received: params });
  }

  // Expose protected methods for testing
  testValidateParams(params: Record<string, any>) {
    return this.validateParams(params);
  }
}

describe('BaseModule', () => {
  it('should have default empty tools array', () => {
    const module = new TestModule();
    expect(module.tools).toEqual([]);
  });

  it('should have metadata', () => {
    const module = new TestModule();
    expect(module.metadata.name).toBe('test-module');
    expect(module.metadata.version).toBe('1.0.0');
  });

  it('should call lifecycle hooks', async () => {
    const module = new TestModule();
    
    expect(module.isLoadCalled()).toBe(false);
    await module.onLoad();
    expect(module.isLoadCalled()).toBe(true);

    expect(module.isReadyCalled()).toBe(false);
    await module.onReady();
    expect(module.isReadyCalled()).toBe(true);

    expect(module.isUnloadCalled()).toBe(false);
    await module.onUnload();
    expect(module.isUnloadCalled()).toBe(true);
  });
});

describe('BaseTool', () => {
  it('should have name and description', () => {
    const tool = new TestTool();
    expect(tool.name).toBe('testTool');
    expect(tool.description).toBe('A test tool');
  });

  it('should validate required params', () => {
    const tool = new TestTool();
    
    // Missing required param
    const error = tool.testValidateParams({});
    expect(error).toBe('Missing required parameter: required');

    // Has required param
    const noError = tool.testValidateParams({ required: 'value' });
    expect(noError).toBeNull();
  });

  it('should return success result', async () => {
    const tool = new TestTool();
    const context: ToolContext = { api: null, threadId: 'test', senderId: 'user1' };
    
    const result = await tool.execute({ required: 'test' }, context);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ received: { required: 'test' } });
  });

  it('should return error result', async () => {
    const tool = new TestTool();
    const context: ToolContext = { api: null, threadId: 'test', senderId: 'user1' };
    
    const result = await tool.execute({ shouldFail: true }, context);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Intentional failure');
  });
});

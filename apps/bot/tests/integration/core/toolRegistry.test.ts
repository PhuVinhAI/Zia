/**
 * Integration Test: Tool Registry
 * Test các chức năng parse và execute tools
 */

import { describe, test, expect } from 'bun:test';
import {
  parseToolCalls,
  hasToolCalls,
  generateToolsPrompt,
  getRegisteredTools,
} from '../../../src/core/tool-registry/tool-registry.js';
import { TEST_CONFIG } from '../setup.js';

describe('Tool Registry Integration', () => {
  describe('parseToolCalls', () => {
    test('parse tool call đơn giản', () => {
      const response = '[tool:getUserInfo]';
      const calls = parseToolCalls(response);

      expect(calls).toBeArray();
      expect(calls.length).toBe(1);
      expect(calls[0].toolName).toBe('getUserInfo');
    });

    test('parse tool call với inline params', () => {
      const response = '[tool:getAllFriends limit=10]';
      const calls = parseToolCalls(response);

      expect(calls.length).toBe(1);
      expect(calls[0].toolName).toBe('getAllFriends');
      expect(calls[0].params.limit).toBe(10);
    });

    test('parse tool call với JSON body', () => {
      const response = '[tool:createFile]{"filename":"test.docx","content":"Hello"}[/tool]';
      const calls = parseToolCalls(response);

      expect(calls.length).toBe(1);
      expect(calls[0].toolName).toBe('createFile');
      expect(calls[0].params.filename).toBe('test.docx');
      expect(calls[0].params.content).toBe('Hello');
    });

    test('parse nhiều tool calls', () => {
      const response = `
        [tool:getUserInfo]
        Some text
        [tool:getAllFriends limit=5]
      `;
      const calls = parseToolCalls(response);

      expect(calls.length).toBe(2);
      expect(calls[0].toolName).toBe('getUserInfo');
      expect(calls[1].toolName).toBe('getAllFriends');
    });

    test('parse tool call với string params có quotes', () => {
      const response = '[tool:search query="hello world"]';
      const calls = parseToolCalls(response);

      expect(calls.length).toBe(1);
      expect(calls[0].params.query).toBe('hello world');
    });

    test('trả về mảng rỗng nếu không có tool call', () => {
      const response = 'This is just a normal message without any tools.';
      const calls = parseToolCalls(response);

      expect(calls).toBeArray();
      expect(calls.length).toBe(0);
    });
  });

  describe('hasToolCalls', () => {
    test('trả về true nếu có tool call', () => {
      expect(hasToolCalls('[tool:test]')).toBe(true);
      expect(hasToolCalls('Some text [tool:test] more text')).toBe(true);
    });

    test('trả về false nếu không có tool call', () => {
      expect(hasToolCalls('No tools here')).toBe(false);
      expect(hasToolCalls('[not a tool]')).toBe(false);
    });
  });

  describe('generateToolsPrompt', () => {
    test('generate prompt không rỗng', () => {
      const prompt = generateToolsPrompt();

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('prompt chứa hướng dẫn cú pháp', () => {
      const prompt = generateToolsPrompt();

      expect(prompt).toContain('[tool:');
      expect(prompt).toContain('[/tool]');
    });
  });

  describe('getRegisteredTools', () => {
    test('trả về danh sách tools', () => {
      const tools = getRegisteredTools();

      expect(tools).toBeArray();
      // Should have some tools registered from modules
    });

    test('mỗi tool có đủ properties', () => {
      const tools = getRegisteredTools();

      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeArray();
        expect(tool.execute).toBeInstanceOf(Function);
      }
    });
  });
});

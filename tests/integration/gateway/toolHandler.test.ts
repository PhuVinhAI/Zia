/**
 * Test: Tool Handler
 */
import { describe, expect, it } from 'bun:test';
import {
  formatToolResultForAI,
  formatAllToolResults,
  isToolOnlyResponse,
} from '../../../src/modules/gateway/handlers/tool.handler.js';
import type { ToolCall, ToolResult } from '../../../src/core/types.js';

describe('Tool Handler', () => {
  describe('formatToolResultForAI()', () => {
    it('should format successful result', () => {
      const toolCall: ToolCall = {
        toolName: 'testTool',
        params: { query: 'test' },
        rawTag: '[tool:testTool]',
      };
      const result: ToolResult = {
        success: true,
        data: { answer: 'Hello' },
      };

      const formatted = formatToolResultForAI(toolCall, result);
      expect(formatted).toContain('[tool_result:testTool]');
      expect(formatted).toContain('Kết quả thành công');
      expect(formatted).toContain('answer');
      expect(formatted).toContain('Hello');
      expect(formatted).toContain('[/tool_result]');
    });

    it('should format error result', () => {
      const toolCall: ToolCall = {
        toolName: 'failTool',
        params: {},
        rawTag: '[tool:failTool]',
      };
      const result: ToolResult = {
        success: false,
        error: 'Something went wrong',
      };

      const formatted = formatToolResultForAI(toolCall, result);
      expect(formatted).toContain('[tool_result:failTool]');
      expect(formatted).toContain('Lỗi');
      expect(formatted).toContain('Something went wrong');
    });

    it('should strip binary data from result', () => {
      const toolCall: ToolCall = {
        toolName: 'tts',
        params: {},
        rawTag: '[tool:tts]',
      };
      const result: ToolResult = {
        success: true,
        data: {
          message: 'Audio generated',
          audio: Buffer.from('binary data'),
          audioBase64: 'base64string',
          fileBuffer: Buffer.from('file'),
          imageBuffer: Buffer.from('image'),
        },
      };

      const formatted = formatToolResultForAI(toolCall, result);
      expect(formatted).toContain('message');
      expect(formatted).not.toContain('binary data');
      expect(formatted).not.toContain('base64string');
    });

    it('should handle imageBuffers array', () => {
      const toolCall: ToolCall = {
        toolName: 'nekosImages',
        params: {},
        rawTag: '[tool:nekosImages]',
      };
      const result: ToolResult = {
        success: true,
        data: {
          imageBuffers: [
            { buffer: Buffer.from('img1'), info: { url: 'http://1.jpg' } },
            { buffer: Buffer.from('img2'), info: { url: 'http://2.jpg' } },
          ],
        },
      };

      const formatted = formatToolResultForAI(toolCall, result);
      expect(formatted).toContain('imagesSent');
      expect(formatted).toContain('imagesInfo');
      expect(formatted).not.toContain('imageBuffers');
    });
  });

  describe('formatAllToolResults()', () => {
    it('should format multiple tool results', () => {
      const toolCalls: ToolCall[] = [
        { toolName: 'tool1', params: {}, rawTag: '[tool:tool1]' },
        { toolName: 'tool2', params: {}, rawTag: '[tool:tool2]' },
      ];
      const results = new Map<string, ToolResult>([
        ['[tool:tool1]', { success: true, data: { a: 1 } }],
        ['[tool:tool2]', { success: true, data: { b: 2 } }],
      ]);

      const formatted = formatAllToolResults(toolCalls, results);
      expect(formatted).toContain('[tool_result:tool1]');
      expect(formatted).toContain('[tool_result:tool2]');
      expect(formatted).toContain('Dựa trên kết quả tool');
    });
  });

  describe('isToolOnlyResponse()', () => {
    it('should return true for tool-only response', () => {
      const response = '[tool:search query="test"]{"q":"test"}[/tool]';
      expect(isToolOnlyResponse(response)).toBe(true);
    });

    it('should return false for response with text', () => {
      const response = 'Let me search for that [tool:search query="test"][/tool]';
      expect(isToolOnlyResponse(response)).toBe(false);
    });

    it('should return false for no tools', () => {
      const response = 'Just a normal response';
      expect(isToolOnlyResponse(response)).toBe(false);
    });

    it('should ignore reactions and stickers', () => {
      const response = '[reaction:heart] [sticker:hello] [tool:test][/tool]';
      expect(isToolOnlyResponse(response)).toBe(true);
    });
  });
});

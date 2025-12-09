/**
 * Base Tool - Abstract class cho tất cả tools
 */
import type { ITool, ToolContext, ToolParameter, ToolResult } from '../types.js';

export abstract class BaseTool implements ITool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameter[];

  abstract execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;

  /**
   * Validate params trước khi execute
   */
  protected validateParams(params: Record<string, any>): string | null {
    for (const param of this.parameters) {
      if (param.required && !(param.name in params)) {
        return `Missing required parameter: ${param.name}`;
      }
    }
    return null;
  }

  /**
   * Helper để tạo success result
   */
  protected success(data: any): ToolResult {
    return { success: true, data };
  }

  /**
   * Helper để tạo error result
   */
  protected error(message: string): ToolResult {
    return { success: false, error: message };
  }
}

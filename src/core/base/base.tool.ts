/**
 * Base Tool - Abstract class cho tất cả tools
 */
import {
  ToolDefinition,
  ToolContext,
  ToolResult,
} from "../../shared/types/tools.types.js";

export abstract class BaseTool implements ToolDefinition {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolDefinition["parameters"];

  abstract execute(
    params: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult>;
}

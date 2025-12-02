/**
 * Tool System Types - Định nghĩa các kiểu dữ liệu cho hệ thống tool
 */

// Định nghĩa một tool
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (
    params: Record<string, any>,
    context: ToolContext
  ) => Promise<ToolResult>;
}

// Parameter của tool
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required: boolean;
  default?: any;
}

// Context được truyền vào khi execute tool
export interface ToolContext {
  api: any; // Zalo API
  threadId: string;
  senderId: string;
  senderName?: string;
}

// Kết quả trả về từ tool
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Tool call được parse từ AI response
export interface ToolCall {
  toolName: string;
  params: Record<string, any>;
  rawTag: string; // Tag gốc để replace
}

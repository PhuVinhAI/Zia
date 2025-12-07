/**
 * Tool Handler - Xử lý flow khi AI gọi tool
 *
 * Flow:
 * 1. AI response chứa [tool:xxx] → Phát hiện và in ra Zalo "🔧 Đang gọi tool: xxx"
 * 2. Lưu AI response (có tool call) vào history với role model
 * 3. Execute tool và lấy kết quả
 * 4. Gửi kết quả tool về cho AI (lưu vào history với role user + tag [tool_result])
 * 5. AI xử lý kết quả và phản hồi cuối cùng ra Zalo
 */

import {
  debugLog,
  executeAllTools,
  hasToolCalls,
  logStep,
  parseToolCalls,
  type ToolCall,
  type ToolContext,
  type ToolResult,
} from '../../../core/index.js';
import { handleAllToolOutputs } from './tool.output.handler.js';

// ═══════════════════════════════════════════════════
// TOOL RESPONSE FORMATTER
// ═══════════════════════════════════════════════════

/**
 * Format kết quả tool thành prompt cho AI
 * Loại bỏ các field binary (audio buffer, image buffer) khỏi response
 */
export function formatToolResultForAI(toolCall: ToolCall, result: ToolResult): string {
  if (result.success) {
    // Clone data và loại bỏ binary fields
    const cleanData = { ...result.data };
    if (cleanData.audio) delete cleanData.audio;
    if (cleanData.audioBase64) delete cleanData.audioBase64;
    if (cleanData.fileBuffer) delete cleanData.fileBuffer;
    if (cleanData.imageBuffer) delete cleanData.imageBuffer;

    // Loại bỏ imageBuffers - chỉ giữ metadata
    if (cleanData.imageBuffers) {
      cleanData.imagesSent = cleanData.imageBuffers.length;
      cleanData.imagesInfo = cleanData.imageBuffers.map((img: any) => img.info || { sent: true });
      delete cleanData.imageBuffers;
    }

    return `[tool_result:${toolCall.toolName}]
Kết quả thành công:
${JSON.stringify(cleanData, null, 2)}
[/tool_result]`;
  } else {
    return `[tool_result:${toolCall.toolName}]
Lỗi: ${result.error}
[/tool_result]`;
  }
}

/**
 * Format tất cả kết quả tools thành một prompt
 */
export function formatAllToolResults(
  toolCalls: ToolCall[],
  results: Map<string, ToolResult>,
): string {
  const parts: string[] = [];

  for (const call of toolCalls) {
    const result = results.get(call.rawTag);
    if (result) {
      parts.push(formatToolResultForAI(call, result));
    }
  }

  return `${parts.join('\n\n')}\n\nDựa trên kết quả tool ở trên, hãy trả lời user một cách tự nhiên.`;
}

// ═══════════════════════════════════════════════════
// TOOL NOTIFICATION
// ═══════════════════════════════════════════════════

/**
 * Gửi thông báo đang gọi tool lên Zalo
 * Chỉ gửi khi CONFIG.showToolCalls = true
 */
export async function notifyToolCall(
  api: any,
  threadId: string,
  toolCalls: ToolCall[],
): Promise<void> {
  const toolNames = toolCalls.map((c) => c.toolName).join(', ');

  const { CONFIG } = await import('../../../shared/constants/config.js');

  if (!CONFIG.showToolCalls) {
    console.log(`[Tool] 🔧 Gọi tool (silent): ${toolNames}`);
    debugLog('TOOL', `Silent tool call: ${toolNames}`);
    return;
  }

  const message = `🔧 Đang gọi tool: ${toolNames}...`;

  try {
    const { getThreadType } = await import('./response.handler.js');
    const threadType = getThreadType(threadId);
    await api.sendMessage(message, threadId, threadType);
    console.log(`[Tool] 🔧 Gọi tool: ${toolNames}`);
    debugLog('TOOL', `Notified tool call: ${toolNames}, threadType: ${threadType}`);
  } catch (e) {
    debugLog('TOOL', `Failed to notify tool call: ${e}`);
  }
}

// ═══════════════════════════════════════════════════
// MAIN TOOL HANDLER
// ═══════════════════════════════════════════════════

export interface ToolHandlerResult {
  hasTools: boolean;
  toolCalls: ToolCall[];
  results: Map<string, ToolResult>;
  promptForAI: string;
  cleanedResponse: string;
}

/**
 * Xử lý tool calls từ AI response
 */
export async function handleToolCalls(
  aiResponse: string,
  api: any,
  threadId: string,
  senderId: string,
  senderName?: string,
): Promise<ToolHandlerResult> {
  // Check if response has tool calls
  if (!hasToolCalls(aiResponse)) {
    return {
      hasTools: false,
      toolCalls: [],
      results: new Map(),
      promptForAI: '',
      cleanedResponse: aiResponse,
    };
  }

  logStep('toolHandler:start', { threadId, senderId });

  // Parse tool calls
  const toolCalls = parseToolCalls(aiResponse);
  debugLog('TOOL', `Found ${toolCalls.length} tool calls`);

  if (toolCalls.length === 0) {
    return {
      hasTools: false,
      toolCalls: [],
      results: new Map(),
      promptForAI: '',
      cleanedResponse: aiResponse,
    };
  }

  // Notify user about tool calls
  await notifyToolCall(api, threadId, toolCalls);

  // Create tool context
  const context: ToolContext = {
    api,
    threadId,
    senderId,
    senderName,
  };

  // Execute all tools
  const results = await executeAllTools(toolCalls, context);

  // Handle tool outputs (send files/media via Zalo)
  await handleAllToolOutputs(api, threadId, toolCalls, results);

  // Format results for AI
  const promptForAI = formatAllToolResults(toolCalls, results);

  // Clean response (remove tool tags)
  let cleanedResponse = aiResponse;
  for (const call of toolCalls) {
    cleanedResponse = cleanedResponse.replace(call.rawTag, '').trim();
  }

  logStep('toolHandler:complete', {
    toolCount: toolCalls.length,
    successCount: Array.from(results.values()).filter((r) => r.success).length,
  });

  return {
    hasTools: true,
    toolCalls,
    results,
    promptForAI,
    cleanedResponse,
  };
}

/**
 * Check if AI response contains only tool calls (no other content)
 */
export function isToolOnlyResponse(response: string): boolean {
  const toolCalls = parseToolCalls(response);
  if (toolCalls.length === 0) return false;

  let cleaned = response;
  for (const call of toolCalls) {
    cleaned = cleaned.replace(call.rawTag, '');
  }

  cleaned = cleaned
    .replace(/\[reaction:\w+\]/gi, '')
    .replace(/\[sticker:\w+\]/gi, '')
    .trim();

  return cleaned.length === 0;
}

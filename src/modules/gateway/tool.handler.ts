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
} from '../../core/index.js';
import { ThreadType } from '../../infrastructure/zalo/zalo.service.js';

// ═══════════════════════════════════════════════════
// TOOL RESPONSE FORMATTER
// ═══════════════════════════════════════════════════

/**
 * Format kết quả tool thành prompt cho AI
 * Loại bỏ các field binary (audio buffer) khỏi response
 */
export function formatToolResultForAI(toolCall: ToolCall, result: ToolResult): string {
  if (result.success) {
    // Clone data và loại bỏ binary fields
    const cleanData = { ...result.data };
    if (cleanData.audio) delete cleanData.audio;
    if (cleanData.audioBase64) delete cleanData.audioBase64;

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
// VOICE MESSAGE HANDLER (for TTS tool)
// ═══════════════════════════════════════════════════

/**
 * Gửi voice message từ TTS tool result
 */
async function sendVoiceFromToolResult(
  api: any,
  threadId: string,
  audioBuffer: Buffer,
): Promise<void> {
  try {
    console.log(`[Tool] 🎤 Đang upload voice (${audioBuffer.length} bytes)...`);
    debugLog('TOOL:TTS', `Uploading voice, size: ${audioBuffer.length}`);

    // 1. Upload file lên Zalo để lấy link
    const uploadResult = await api.uploadAttachment(
      {
        filename: `voice_${Date.now()}.mp3`,
        data: audioBuffer,
        metadata: { totalSize: audioBuffer.length, width: 0, height: 0 },
      },
      threadId,
      ThreadType.User,
    );

    // 2. Lấy URL từ kết quả upload
    const fileUrl = uploadResult[0]?.fileUrl || uploadResult[0]?.normalUrl;
    if (!fileUrl) {
      throw new Error('Không lấy được link file sau khi upload');
    }

    debugLog('TOOL:TTS', `Upload success, URL: ${fileUrl}`);

    // 3. Gửi Voice Message
    await api.sendVoice({ voiceUrl: fileUrl }, threadId, ThreadType.User);
    console.log(`[Tool] ✅ Đã gửi voice message!`);
  } catch (e: any) {
    console.error(`[Tool] ❌ Lỗi gửi voice:`, e.message);
    debugLog('TOOL:TTS', `Voice send error: ${e.message}`);
    throw e;
  }
}

// ═══════════════════════════════════════════════════
// TOOL NOTIFICATION
// ═══════════════════════════════════════════════════

/**
 * Gửi thông báo đang gọi tool lên Zalo
 * Dùng Zalo rich text format: *bold* _italic_
 * Chỉ gửi khi CONFIG.showToolCalls = true
 */
export async function notifyToolCall(
  api: any,
  threadId: string,
  toolCalls: ToolCall[],
): Promise<void> {
  const toolNames = toolCalls.map((c) => c.toolName).join(', ');

  // Import CONFIG để check setting
  const { CONFIG } = await import('../../shared/constants/config.js');

  // Nếu tắt showToolCalls, chỉ log console, không gửi tin nhắn
  if (!CONFIG.showToolCalls) {
    console.log(`[Tool] 🔧 Gọi tool (silent): ${toolNames}`);
    debugLog('TOOL', `Silent tool call: ${toolNames}`);
    return;
  }

  // Zalo format: *bold* _italic_ (không phải markdown)
  const message = `🔧 *Đang gọi tool:* _${toolNames}_...`;

  try {
    // Import createRichMessage để format đúng Zalo style
    const { createRichMessage } = await import('../../shared/utils/richText.js');
    const richMsg = createRichMessage(message);
    await api.sendMessage(richMsg, threadId, ThreadType.User);
    console.log(`[Tool] 🔧 Gọi tool: ${toolNames}`);
    debugLog('TOOL', `Notified tool call: ${toolNames}`);
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
  cleanedResponse: string; // Response với tool tags đã bị xóa
}

/**
 * Xử lý tool calls từ AI response
 *
 * @param aiResponse - Response từ AI (có thể chứa tool calls)
 * @param api - Zalo API
 * @param threadId - Thread ID
 * @param senderId - Sender ID
 * @param senderName - Sender name (optional)
 * @returns ToolHandlerResult
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

  // Handle special tools that need immediate action (e.g., TTS → send voice)
  for (const call of toolCalls) {
    const result = results.get(call.rawTag);
    if (result?.success && call.toolName === 'textToSpeech' && result.data?.audio) {
      try {
        await sendVoiceFromToolResult(api, threadId, result.data.audio);
      } catch (e: any) {
        debugLog('TOOL:TTS', `Failed to send voice: ${e.message}`);
      }
    }
  }

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

  // Remove all tool tags and check if anything meaningful remains
  let cleaned = response;
  for (const call of toolCalls) {
    cleaned = cleaned.replace(call.rawTag, '');
  }

  // Remove whitespace and common tags
  cleaned = cleaned
    .replace(/\[reaction:\w+\]/gi, '')
    .replace(/\[sticker:\w+\]/gi, '')
    .trim();

  return cleaned.length === 0;
}

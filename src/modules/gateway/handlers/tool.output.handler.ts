/**
 * Tool Output Handler - Xử lý output từ tools
 * Quyết định gửi file/media qua Zalo hay trả text về AI
 */

import { debugLog } from '../../../core/index.js';
import type { ToolCall, ToolResult } from '../../../core/types.js';
import { getThreadType } from './response.handler.js';

// ═══════════════════════════════════════════════════
// MEDIA SENDERS
// ═══════════════════════════════════════════════════

/**
 * Gửi voice message từ TTS tool result
 */
export async function sendVoice(
  api: any,
  threadId: string,
  audioBuffer: Buffer,
): Promise<void> {
  const threadType = getThreadType(threadId);
  console.log(`[Tool] 🎤 Đang upload voice (${audioBuffer.length} bytes)...`);
  debugLog('TOOL:TTS', `Uploading voice, size: ${audioBuffer.length}, threadType: ${threadType}`);

  const uploadResult = await api.uploadAttachment(
    {
      filename: `voice_${Date.now()}.mp3`,
      data: audioBuffer,
      metadata: { totalSize: audioBuffer.length, width: 0, height: 0 },
    },
    threadId,
    threadType,
  );

  const fileUrl = uploadResult[0]?.fileUrl || uploadResult[0]?.normalUrl;
  if (!fileUrl) {
    throw new Error('Không lấy được link file sau khi upload');
  }

  debugLog('TOOL:TTS', `Upload success, URL: ${fileUrl}`);
  await api.sendVoice({ voiceUrl: fileUrl }, threadId, threadType);
  console.log(`[Tool] ✅ Đã gửi voice message!`);
}

/**
 * Gửi ảnh từ tool result
 */
export async function sendImage(
  api: any,
  threadId: string,
  buffer: Buffer,
  filename: string,
): Promise<void> {
  const threadType = getThreadType(threadId);
  console.log(`[Tool] 📊 Đang gửi ảnh ${filename} (${buffer.length} bytes)...`);
  debugLog('TOOL:IMG', `Sending image: ${filename}, size: ${buffer.length}, threadType: ${threadType}`);

  const attachment = {
    filename,
    data: buffer,
    metadata: {
      width: 800,
      height: 600,
      totalSize: buffer.length,
    },
  };

  await api.sendMessage({ msg: '', attachments: [attachment] }, threadId, threadType);
  console.log(`[Tool] ✅ Đã gửi ảnh ${filename}!`);
  debugLog('TOOL:IMG', `Image sent successfully: ${filename}`);
}

/**
 * Gửi file document từ tool result
 */
export async function sendDocument(
  api: any,
  threadId: string,
  buffer: Buffer,
  filename: string,
): Promise<void> {
  const threadType = getThreadType(threadId);
  console.log(`[Tool] 📄 Đang gửi file ${filename} (${buffer.length} bytes)...`);
  debugLog('TOOL:DOC', `Sending document: ${filename}, size: ${buffer.length}, threadType: ${threadType}`);

  const attachment = {
    filename,
    data: buffer,
    metadata: {
      width: 0,
      height: 0,
      totalSize: buffer.length,
    },
  };

  await api.sendMessage({ msg: '', attachments: [attachment] }, threadId, threadType);
  console.log(`[Tool] ✅ Đã gửi file ${filename}!`);
  debugLog('TOOL:DOC', `Document sent successfully: ${filename}`);
}

/**
 * Gửi nhiều ảnh với delay
 */
export async function sendImages(
  api: any,
  threadId: string,
  images: Array<{ buffer: Buffer; mimeType: string }>,
  prefix: string,
): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = img.mimeType.includes('png') ? 'png' : img.mimeType.includes('gif') ? 'gif' : 'jpg';
    const filename = `${prefix}_${Date.now()}_${i}.${ext}`;
    await sendImage(api, threadId, img.buffer, filename);
    if (i < images.length - 1) {
      await new Promise((r) => setTimeout(r, 500)); // Delay giữa các ảnh
    }
  }
}

// ═══════════════════════════════════════════════════
// TOOL OUTPUT HANDLERS MAP
// ═══════════════════════════════════════════════════

type OutputHandler = (api: any, threadId: string, result: ToolResult) => Promise<void>;

const outputHandlers: Record<string, OutputHandler> = {
  // TTS → send voice
  textToSpeech: async (api, threadId, result) => {
    if (result.data?.audio) {
      await sendVoice(api, threadId, result.data.audio);
    }
  },

  // File (Word, txt, json, code, etc.) → send file
  createFile: async (api, threadId, result) => {
    if (result.data?.fileBuffer) {
      await sendDocument(api, threadId, result.data.fileBuffer, result.data.filename);
    }
  },

  // Chart → send image
  createChart: async (api, threadId, result) => {
    if (result.data?.imageBuffer) {
      await sendImage(api, threadId, result.data.imageBuffer, result.data.filename);
    }
  },

  // solveMath → send PDF
  solveMath: async (api, threadId, result) => {
    if (result.data?.fileBuffer) {
      await sendDocument(api, threadId, result.data.fileBuffer, result.data.filename);
    }
  },

  // nekosImages → send images from buffer
  nekosImages: async (api, threadId, result) => {
    if (result.data?.imageBuffers) {
      await sendImages(api, threadId, result.data.imageBuffers, 'nekos');
    }
  },

  // freepikImage → send images from buffer
  freepikImage: async (api, threadId, result) => {
    if (result.data?.imageBuffers) {
      await sendImages(api, threadId, result.data.imageBuffers, 'freepik');
    }
  },

  // giphyGif → send GIFs from buffer
  giphyGif: async (api, threadId, result) => {
    if (result.data?.imageBuffers) {
      await sendImages(api, threadId, result.data.imageBuffers, 'giphy');
    }
  },

  // createApp → send HTML file
  createApp: async (api, threadId, result) => {
    if (result.data?.fileBuffer) {
      await sendDocument(api, threadId, result.data.fileBuffer, result.data.filename);
    }
  },
};

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════

/**
 * Xử lý output của một tool call
 * Gửi file/media qua Zalo nếu cần
 */
export async function handleToolOutput(
  api: any,
  threadId: string,
  toolCall: ToolCall,
  result: ToolResult,
): Promise<void> {
  if (!result.success) return;

  const handler = outputHandlers[toolCall.toolName];
  if (handler) {
    try {
      await handler(api, threadId, result);
    } catch (e: any) {
      debugLog(`TOOL:${toolCall.toolName.toUpperCase()}`, `Failed to send output: ${e.message}`);
    }
  }
}

/**
 * Xử lý output của tất cả tool calls
 */
export async function handleAllToolOutputs(
  api: any,
  threadId: string,
  toolCalls: ToolCall[],
  results: Map<string, ToolResult>,
): Promise<void> {
  for (const call of toolCalls) {
    const result = results.get(call.rawTag);
    if (result) {
      await handleToolOutput(api, threadId, call, result);
    }
  }
}

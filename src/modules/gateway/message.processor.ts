/**
 * Mixed Content Handler - Xử lý tất cả loại tin nhắn
 */

import { debugLog, logError, logStep } from '../../core/logger/logger.js';
import {
  extractYouTubeUrls,
  generateContent,
  generateContentStream,
  type MediaPart,
} from '../../infrastructure/gemini/gemini.provider.js';
import { PROMPTS } from '../../infrastructure/gemini/prompts.js';
import { ThreadType } from '../../infrastructure/zalo/zalo.service.js';
import { CONFIG } from '../../shared/constants/config.js';
import {
  getHistory,
  saveResponseToHistory,
  saveToHistory,
  saveToolResultToHistory,
} from '../../shared/utils/history.js';
import type { ClassifiedMessage, MessageType } from './classifier.js';
// Import từ các module mới
import { classifyMessage, classifyMessages, countMessageTypes } from './classifier.js';
import { addQuoteMedia, prepareMediaParts } from './media.processor.js';
import { buildPrompt, extractTextFromMessages, processPrefix } from './prompt.builder.js';
import { extractQuoteInfo } from './quote.parser.js';
import { checkRateLimit, markApiCall } from './rate-limit.guard.js';
import { createStreamCallbacks, sendResponse } from './response.handler.js';
import { handleToolCalls, isToolOnlyResponse } from './tool.handler.js';

// Re-export types cho backward compatibility
export type { ClassifiedMessage, MessageType };
export { classifyMessage as classifyMessageDetailed };

/**
 * Handler CHÍNH - xử lý TẤT CẢ loại tin nhắn trong 1 flow duy nhất
 */
export async function handleMixedContent(
  api: any,
  messages: any[],
  threadId: string,
  signal?: AbortSignal,
) {
  // 1. Phân loại tất cả tin nhắn
  const classified = classifyMessages(messages);
  const counts = countMessageTypes(classified);

  console.log(
    `[Bot] 📦 Xử lý ${messages.length} tin nhắn: ` +
      Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(', '),
  );
  logStep('handleMixedContent', { threadId, counts, total: messages.length });

  try {
    // 2. Lưu vào history
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    if (signal?.aborted) return debugLog('MIXED', 'Aborted before processing');

    await api.sendTypingEvent(threadId, ThreadType.User);

    // 3. Lấy history và context
    const history = getHistory(threadId);
    const lastMsg = messages[messages.length - 1];

    // 4. Parse quote
    const { quoteContent, quoteMedia } = extractQuoteInfo(lastMsg);

    // 5. Lấy text từ tất cả tin nhắn
    const combinedText = extractTextFromMessages(classified);

    // 6. Check prefix
    const { shouldContinue, userText } = processPrefix(
      combinedText,
      CONFIG.requirePrefix,
      CONFIG.prefix,
    );

    if (!shouldContinue) {
      await api.sendMessage(PROMPTS.prefixHint(CONFIG.prefix), threadId, ThreadType.User);
      return;
    }

    // 7. Chuẩn bị media parts
    const { media, notes } = await prepareMediaParts(api, classified);
    if (signal?.aborted) return;

    // 8. Thêm media từ quote nếu có
    await addQuoteMedia(api, quoteMedia, media, notes);

    // 9. Check YouTube
    const youtubeUrls = extractYouTubeUrls(combinedText);
    if (youtubeUrls.length > 0) {
      console.log(`[Bot] 🎬 Phát hiện ${youtubeUrls.length} YouTube video`);
      youtubeUrls.forEach((url) => media.push({ type: 'youtube', url }));
    }

    // 10. Build prompt
    const quoteHasMedia = quoteMedia.type !== 'none';
    const quoteMediaType = quoteHasMedia ? quoteMedia.type : undefined;
    const prompt = buildPrompt(
      classified,
      userText,
      quoteContent,
      quoteHasMedia,
      quoteMediaType,
      youtubeUrls,
      notes,
    );
    debugLog('MIXED', `Prompt: ${prompt.substring(0, 200)}...`);
    debugLog('MIXED', `Media parts: ${media.length}`);

    // 11. Check rate limit
    const waitTime = checkRateLimit(threadId);
    if (waitTime > 0) {
      const waitSec = Math.ceil(waitTime / 1000);
      console.log(`[Bot] ⏳ Rate limit: chờ ${waitSec}s`);
      await api.sendMessage(PROMPTS.rateLimit(waitSec), threadId, ThreadType.User);
      await new Promise((r) => setTimeout(r, waitTime));
      if (signal?.aborted) return;
    }
    markApiCall(threadId);

    // 12. Gọi Gemini và xử lý response
    const mediaToSend = media.length > 0 ? media : undefined;
    const senderId = lastMsg.data?.uidFrom || threadId;
    const senderName = lastMsg.data?.dName;

    await processAIResponse(
      api,
      threadId,
      lastMsg,
      messages,
      prompt,
      mediaToSend,
      history,
      senderId,
      senderName,
      signal,
      0,
    );
  } catch (e: any) {
    if (e.message === 'Aborted' || signal?.aborted) {
      return debugLog('MIXED', 'Aborted during processing');
    }
    logError('handleMixedContent', e);
    console.error('[Bot] Lỗi xử lý:', e);
  }
}

/**
 * Xử lý AI response với tool support (recursive)
 */
async function processAIResponse(
  api: any,
  threadId: string,
  lastMsg: any,
  messages: any[],
  currentPrompt: string,
  currentMedia: MediaPart[] | undefined,
  currentHistory: any[],
  senderId: string,
  senderName: string | undefined,
  signal: AbortSignal | undefined,
  depth: number,
): Promise<void> {
  const MAX_TOOL_DEPTH = CONFIG.maxToolDepth || 10;
  if (depth >= MAX_TOOL_DEPTH) {
    console.log(`[Bot] ⚠️ Đạt giới hạn tool depth (${MAX_TOOL_DEPTH})`);
    return;
  }

  if (CONFIG.useStreaming) {
    await processStreamingResponse(
      api,
      threadId,
      lastMsg,
      messages,
      currentPrompt,
      currentMedia,
      currentHistory,
      senderId,
      senderName,
      signal,
      depth,
    );
  } else {
    await processNonStreamingResponse(
      api,
      threadId,
      lastMsg,
      messages,
      currentPrompt,
      currentMedia,
      currentHistory,
      senderId,
      senderName,
      signal,
      depth,
    );
  }
}

/**
 * Xử lý streaming response
 */
async function processStreamingResponse(
  api: any,
  threadId: string,
  lastMsg: any,
  messages: any[],
  currentPrompt: string,
  currentMedia: MediaPart[] | undefined,
  currentHistory: any[],
  senderId: string,
  senderName: string | undefined,
  signal: AbortSignal | undefined,
  depth: number,
): Promise<void> {
  const callbacks = createStreamCallbacks(api, threadId, lastMsg, messages, true);
  callbacks.signal = signal;

  const result = await generateContentStream(
    currentPrompt,
    callbacks,
    currentMedia,
    threadId,
    currentHistory,
  );

  if (signal?.aborted) {
    debugLog('MIXED', `Aborted with ${result ? 'partial' : 'no'} response`);
    if (result) await saveResponseToHistory(threadId, result);
    return;
  }

  if (!result) return;

  // Check for tool calls
  const toolResult = await handleToolCalls(result, api, threadId, senderId, senderName);

  if (toolResult.hasTools) {
    debugLog('MIXED', `Tool detected: ${toolResult.toolCalls.map((t) => t.toolName).join(', ')}`);

    await saveResponseToHistory(threadId, result);
    await saveToolResultToHistory(threadId, toolResult.promptForAI);

    const updatedHistory = getHistory(threadId);
    await processAIResponse(
      api,
      threadId,
      lastMsg,
      messages,
      toolResult.promptForAI,
      undefined,
      updatedHistory,
      senderId,
      senderName,
      signal,
      depth + 1,
    );
  } else {
    await saveResponseToHistory(threadId, result);
    console.log(`[Bot] ✅ Đã trả lời (streaming)!`);
  }
}

/**
 * Xử lý non-streaming response
 */
async function processNonStreamingResponse(
  api: any,
  threadId: string,
  lastMsg: any,
  messages: any[],
  currentPrompt: string,
  currentMedia: MediaPart[] | undefined,
  currentHistory: any[],
  senderId: string,
  senderName: string | undefined,
  signal: AbortSignal | undefined,
  depth: number,
): Promise<void> {
  const aiReply = await generateContent(currentPrompt, currentMedia, threadId, currentHistory);

  if (signal?.aborted) return;

  const responseText = aiReply.messages
    .map((m) => m.text)
    .filter(Boolean)
    .join(' ');

  const toolResult = await handleToolCalls(responseText, api, threadId, senderId, senderName);

  if (toolResult.hasTools) {
    if (!isToolOnlyResponse(responseText)) {
      await sendResponse(
        api,
        {
          ...aiReply,
          messages: aiReply.messages.map((m) => ({
            ...m,
            text: m.text ? toolResult.cleanedResponse : m.text,
          })),
        },
        threadId,
        lastMsg,
        messages,
      );
    }

    await saveResponseToHistory(threadId, responseText);
    await saveToolResultToHistory(threadId, toolResult.promptForAI);

    const updatedHistory = getHistory(threadId);
    await processAIResponse(
      api,
      threadId,
      lastMsg,
      messages,
      toolResult.promptForAI,
      undefined,
      updatedHistory,
      senderId,
      senderName,
      signal,
      depth + 1,
    );
  } else {
    await sendResponse(api, aiReply, threadId, lastMsg, messages);
    await saveResponseToHistory(threadId, responseText);
    console.log(`[Bot] ✅ Đã trả lời!`);
  }
}

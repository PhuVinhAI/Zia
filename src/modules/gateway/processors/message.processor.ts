/**
 * Mixed Content Handler - Xử lý tất cả loại tin nhắn
 */

import { CONFIG } from '../../../core/config/config.js';
import { debugLog, logError, logStep } from '../../../core/logger/logger.js';
import {
  extractYouTubeUrls,
  generateContent,
  generateContentStream,
  type MediaPart,
} from '../../../infrastructure/ai/providers/gemini/gemini.provider.js';
import { PROMPTS } from '../../../infrastructure/ai/providers/gemini/prompts.js';
import { ThreadType } from '../../../infrastructure/messaging/zalo/zalo.service.js';
import {
  getHistory,
  saveResponseToHistory,
  saveToHistory,
  saveToolResultToHistory,
} from '../../../shared/utils/history/history.js';
import { setThreadType } from '../../../shared/utils/message/messageSender.js';
import { markPendingToolExecution } from '../../../shared/utils/taskManager.js';
// Import từ classifier
import {
  type ClassifiedMessage,
  classifyMessages,
  countMessageTypes,
  isBotMentioned,
  type MessageType,
} from '../classifier.js';
import { checkRateLimit, markApiCall } from '../guards/rate-limit.guard.js';
import { createStreamCallbacks, sendResponse } from '../handlers/response.handler.js';
import { handleToolCalls, isToolOnlyResponse } from '../handlers/tool.handler.js';
import { startTypingWithRefresh } from '../services/message.buffer.js';
import { buildPrompt, extractTextFromMessages, processPrefix } from '../services/prompt.builder.js';
import { extractQuoteInfo } from '../services/quote.parser.js';
import { addQuoteMedia, prepareMediaParts } from './media.processor.js';

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
    // 2. Lưu vào history (luôn lưu để Bot nhớ mọi thứ kể cả khi im lặng)
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    // 3. Xác định loại Thread (User hay Group)
    const lastMsg = messages[messages.length - 1];
    const isGroup = lastMsg.type === ThreadType.Group;

    // 4. Logic chặn trả lời trong nhóm nếu không được mention
    if (isGroup) {
      const botId = api.getContext().uid;
      const botName = CONFIG.name || 'Zia';

      // Kiểm tra xem có tin nhắn nào trong batch nhắc tới Bot không
      const mentioned = messages.some((msg) => isBotMentioned(msg, botId, botName));

      if (!mentioned) {
        debugLog('GATEWAY', `Group message saved to history but ignored (no mention): ${threadId}`);
        return; // Dừng xử lý - không typing, không gọi AI
      }

      console.log(`[Bot] 🔔 Được tag trong nhóm ${threadId}, đang trả lời...`);
    }

    if (signal?.aborted) return debugLog('MIXED', 'Aborted before processing');

    // Gửi typing event với đúng ThreadType (có auto-refresh)
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    // Lưu ThreadType để các hàm response sử dụng
    setThreadType(threadId, threadType);
    startTypingWithRefresh(api, threadId);

    // 5. Lấy history và context
    const history = getHistory(threadId);

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
      await api.sendMessage(PROMPTS.prefixHint(CONFIG.prefix), threadId, threadType);
      return;
    }

    // 7. Chuẩn bị media parts
    const { media, notes } = await prepareMediaParts(api, classified);
    if (signal?.aborted) return;

    // 8. Thêm media từ quote nếu có (truyền history để check media đã có chưa)
    await addQuoteMedia(api, quoteMedia, media, notes, history);

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
      await api.sendMessage(PROMPTS.rateLimit(waitSec), threadId, threadType);
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
    if (result) {
      await saveResponseToHistory(threadId, result);

      // Nếu có tool call trong response, vẫn execute tool trước khi return
      // Điều này đảm bảo tool như freepikImage vẫn gửi ảnh dù bị abort
      const toolResult = await handleToolCalls(result, api, threadId, senderId, senderName);
      if (toolResult.hasTools) {
        debugLog('MIXED', `Executing ${toolResult.toolCalls.length} tool(s) despite abort`);
        // Lưu tool result vào history để AI biết tool đã chạy
        await saveToolResultToHistory(threadId, toolResult.promptForAI);
        // Đánh dấu để buffer biết không cần merge messages
        markPendingToolExecution(threadId);
      }
    }
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

  const responseText = aiReply.messages
    .map((m) => m.text)
    .filter(Boolean)
    .join(' ');

  // Nếu bị abort, vẫn execute tool trước khi return (giống streaming)
  if (signal?.aborted) {
    debugLog('MIXED', `Aborted (non-streaming) with response`);
    if (responseText) {
      await saveResponseToHistory(threadId, responseText);

      // Nếu có tool call trong response, vẫn execute tool trước khi return
      const toolResult = await handleToolCalls(responseText, api, threadId, senderId, senderName);
      if (toolResult.hasTools) {
        debugLog(
          'MIXED',
          `Executing ${toolResult.toolCalls.length} tool(s) despite abort (non-streaming)`,
        );
        await saveToolResultToHistory(threadId, toolResult.promptForAI);
        markPendingToolExecution(threadId);
      }
    }
    return;
  }

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

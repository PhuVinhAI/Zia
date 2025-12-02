import { ThreadType } from "../services/zalo.js";
import { generateContentStream } from "../services/streaming.js";
import { createStreamCallbacks } from "./streamResponse.js";
import {
  saveToHistory,
  saveResponseToHistory,
  getHistoryContext,
} from "../utils/history.js";
import { CONFIG, PROMPTS } from "../config/index.js";
import { logStep, logError, debugLog } from "../utils/logger.js";
import { completeTask } from "../utils/taskManager.js";

/**
 * Giữ trạng thái Typing liên tục cho đến khi dừng
 */
function startTyping(api: any, threadId: string, type: any) {
  // Gửi lần đầu ngay lập tức
  api.sendTypingEvent(threadId, type).catch(() => {});

  // Lặp lại mỗi 3 giây để duy trì trạng thái
  const interval = setInterval(() => {
    api.sendTypingEvent(threadId, type).catch(() => {});
  }, 3000);

  // Trả về hàm để dừng typing
  return function stopTyping() {
    clearInterval(interval);
  };
}

/**
 * Handler text với streaming - gửi response ngay khi có tag hoàn chỉnh
 * @param signal - AbortSignal để hủy khi bị ngắt lời
 */
export async function handleTextStream(
  api: any,
  message: any,
  threadId: string,
  signal?: AbortSignal
) {
  const content = message.data?.content;
  let userPrompt = content;

  // Kiểm tra prefix
  if (CONFIG.requirePrefix) {
    if (!content.startsWith(CONFIG.prefix)) return;
    userPrompt = content.replace(CONFIG.prefix, "").trim();
    if (!userPrompt) {
      await api.sendMessage(
        `💡 Cú pháp: ${CONFIG.prefix} <câu hỏi>`,
        threadId,
        ThreadType.User
      );
      return;
    }
  }

  // Xử lý tin nhắn có trích dẫn
  const quoteData = message.data?.quote;
  if (quoteData) {
    const quoteContent =
      quoteData.msg || quoteData.content || "(nội dung không xác định)";
    console.log(`[Bot] 💬 User reply: "${quoteContent}"`);
    userPrompt = PROMPTS.quote(quoteContent, content);
  }

  // Lưu vào history
  saveToHistory(threadId, message);

  // Lấy context từ history
  const historyContext = getHistoryContext(threadId);
  const promptWithHistory = historyContext
    ? `Lịch sử chat gần đây:\n${historyContext}\n\nTin nhắn mới từ User: ${userPrompt}`
    : userPrompt;

  console.log(`[Bot] 📩 Câu hỏi (streaming): ${userPrompt}`);
  logStep("handleTextStream", {
    userPrompt,
    hasQuote: !!quoteData,
    historyLength: historyContext?.length || 0,
    threadId,
  });

  // Bắt đầu typing liên tục
  const stopTyping = startTyping(api, threadId, ThreadType.User);

  // Tạo callbacks cho streaming
  const callbacks = createStreamCallbacks(api, threadId, message);

  // Gắn signal vào callbacks để streaming service kiểm tra
  if (signal) {
    callbacks.signal = signal;
  }

  // Buffer để lưu full response cho history
  let fullResponse = "";
  const originalOnMessage = callbacks.onMessage;
  callbacks.onMessage = async (text: string, quoteIndex?: number) => {
    // Kiểm tra abort trước khi gửi tin nhắn
    if (signal?.aborted) {
      debugLog("TEXTSTREAM", "Aborted: Skipping message send");
      throw new Error("Aborted");
    }
    fullResponse += text + " ";
    await originalOnMessage?.(text, quoteIndex);
  };

  // Wrap onComplete để dừng typing
  const originalOnComplete = callbacks.onComplete;
  callbacks.onComplete = () => {
    stopTyping();
    originalOnComplete?.();
  };

  // Wrap onError để dừng typing khi lỗi
  const originalOnError = callbacks.onError;
  callbacks.onError = (error: Error) => {
    stopTyping();
    originalOnError?.(error);
  };

  try {
    // Gọi streaming
    await generateContentStream(promptWithHistory, callbacks);
  } catch (error: any) {
    stopTyping();
    // Nếu bị abort thì không log lỗi đỏ, chỉ log info
    if (error.message === "Aborted" || signal?.aborted) {
      console.log(`[Bot] 🛑 Đã dừng trả lời thread ${threadId} do có tin mới.`);
      debugLog("TEXTSTREAM", `Aborted for thread ${threadId}`);
      return; // Thoát sớm, không lưu history
    }
    logError("handleTextStream", error);
    throw error;
  } finally {
    // Đánh dấu task hoàn thành (nếu không bị abort)
    if (!signal?.aborted) {
      completeTask(threadId);
    }
  }

  // Lưu response vào history (chỉ khi không bị abort)
  if (fullResponse.trim() && !signal?.aborted) {
    await saveResponseToHistory(threadId, fullResponse.trim());
    logStep("savedResponse", { responseLength: fullResponse.length });
  }

  console.log(`[Bot] ✅ Đã trả lời (streaming).`);
}

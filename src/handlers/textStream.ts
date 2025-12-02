import { ThreadType } from "../services/zalo.js";
import { generateContentStream, chatStream } from "../services/streaming.js";
import { createStreamCallbacks } from "./streamResponse.js";
import {
  saveToHistory,
  saveResponseToHistory,
  getHistoryContext,
} from "../utils/history.js";
import { CONFIG, PROMPTS } from "../config/index.js";

/**
 * Handler text với streaming - gửi response ngay khi có tag hoàn chỉnh
 */
export async function handleTextStream(
  api: any,
  message: any,
  threadId: string
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
  await api.sendTypingEvent(threadId, ThreadType.User);

  // Tạo callbacks cho streaming
  const callbacks = createStreamCallbacks(api, threadId, message);

  // Buffer để lưu full response cho history
  let fullResponse = "";
  const originalOnMessage = callbacks.onMessage;
  callbacks.onMessage = async (text: string, quoteIndex?: number) => {
    fullResponse += text + " ";
    await originalOnMessage?.(text, quoteIndex);
  };

  // Gọi streaming
  await generateContentStream(promptWithHistory, callbacks);

  // Lưu response vào history
  if (fullResponse.trim()) {
    await saveResponseToHistory(threadId, fullResponse.trim());
  }

  console.log(`[Bot] ✅ Đã trả lời (streaming).`);
}

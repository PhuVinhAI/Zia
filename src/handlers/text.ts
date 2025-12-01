import { ThreadType } from "../services/zalo.js";
import {
  generateContent,
  generateWithYouTube,
  generateWithMultipleYouTube,
  extractYouTubeUrls,
} from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { saveToHistory, getHistoryContext } from "../utils/history.js";
import { CONFIG, PROMPTS } from "../config/index.js";
import { AIResponse } from "../config/schema.js";

export async function handleText(api: any, message: any, threadId: string) {
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

  console.log(`[Bot] 📩 Câu hỏi: ${userPrompt}`);
  await api.sendTypingEvent(threadId, ThreadType.User);

  let aiReply: AIResponse;

  // Kiểm tra YouTube URLs - xử lý riêng vì cần gửi video trực tiếp cho Gemini
  const youtubeUrls = extractYouTubeUrls(content);
  if (youtubeUrls.length > 0) {
    console.log(`[Bot] 🎬 Phát hiện ${youtubeUrls.length} YouTube video`);
    const ytPrompt = PROMPTS.youtube(youtubeUrls, content);
    if (youtubeUrls.length === 1) {
      aiReply = await generateWithYouTube(ytPrompt, youtubeUrls[0]);
    } else {
      aiReply = await generateWithMultipleYouTube(ytPrompt, youtubeUrls);
    }
  } else {
    // Tin nhắn text thường - URL Context tool sẽ tự động đọc link nếu có
    aiReply = await generateContent(promptWithHistory);
  }

  await sendResponse(api, aiReply, threadId, message);

  // Lưu response vào history - gộp tất cả text messages
  const responseText = aiReply.messages
    .map((m) => m.text)
    .filter(Boolean)
    .join(" ");
  saveToHistory(threadId, {
    isSelf: true,
    data: { content: responseText },
  });

  console.log(`[Bot] ✅ Đã trả lời.`);
}

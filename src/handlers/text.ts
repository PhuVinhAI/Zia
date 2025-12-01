import { ThreadType } from "../services/zalo.js";
import { sendMessage, generateContent } from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { saveToHistory, getHistoryContext } from "../utils/history.js";
import { CONFIG, PROMPTS } from "../config/index.js";

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

  // Xử lý link trong tin nhắn
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex);
  if (urls && urls.length > 0) {
    console.log(`[Bot] 🔗 Phát hiện ${urls.length} link`);
    const linkInfo = urls
      .map((url: string) => {
        try {
          const domain = new URL(url).hostname;
          return `- ${url} (từ ${domain})`;
        } catch {
          return `- ${url}`;
        }
      })
      .join("\n");
    userPrompt = PROMPTS.link(linkInfo, content);
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

  // Sử dụng multi-turn chat hoặc single generate
  const aiReply = await generateContent(promptWithHistory);
  await sendResponse(api, aiReply, threadId, message);

  // Lưu response vào history
  saveToHistory(threadId, {
    isSelf: true,
    data: { content: aiReply.replace(/\[.*?\]/g, "").trim() },
  });

  console.log(`[Bot] ✅ Đã trả lời.`);
}

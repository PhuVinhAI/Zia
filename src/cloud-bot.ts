import * as zcajs from "zca-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const { Zalo, ThreadType, Reactions } = zcajs as any;

// --- CẤU HÌNH ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TRIGGER_PREFIX = "#bot"; // Prefix để gọi bot (tùy chọn)
const RATE_LIMIT_MS = 3000; // Giới hạn 3 giây giữa các tin nhắn
const REQUIRE_PREFIX = false; // true = cần prefix, false = trả lời mọi tin nhắn
const ALLOWED_NAME = "Huỳnh Phước Thọ"; // Chỉ trả lời người có tên này (để trống "" = trả lời tất cả)

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const zalo = new Zalo({ selfListen: true, logging: true });

// Rate limiter: lưu thời gian tin nhắn cuối của mỗi user
const lastMessageTime = new Map<string, number>();

// Lưu lịch sử tin nhắn gần đây của mỗi thread (để AI có thể quote)
const messageHistory = new Map<string, any[]>();
const MAX_HISTORY = 10; // Giữ 10 tin nhắn gần nhất

function saveMessageToHistory(threadId: string, message: any) {
  const history = messageHistory.get(threadId) || [];
  history.push(message);
  if (history.length > MAX_HISTORY) {
    history.shift(); // Xóa tin cũ nhất
  }
  messageHistory.set(threadId, history);
}

function getHistoryContext(threadId: string): string {
  const history = messageHistory.get(threadId) || [];
  if (history.length === 0) return "";

  return history
    .map((msg, index) => {
      const sender = msg.isSelf ? "Bot" : "User";
      const content =
        typeof msg.data?.content === "string" ? msg.data.content : "(media)";
      return `[${index}] ${sender}: ${content}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `Bạn là trợ lý AI vui tính trên Zalo. Trả lời ngắn gọn, tự nhiên.

QUAN TRỌNG - Thêm tag cảm xúc ở ĐẦU câu trả lời:
- [HEART] nếu yêu thương, cảm ơn, dễ thương
- [HAHA] nếu vui vẻ, hài hước  
- [WOW] nếu ngạc nhiên, ấn tượng
- [SAD] nếu buồn, đồng cảm
- [ANGRY] nếu tức giận
- [LIKE] cho các trường hợp bình thường

Nếu muốn TRÍCH DẪN (quote) một tin nhắn cũ trong lịch sử, thêm [QUOTE:số] ở đầu.
Ví dụ: "[QUOTE:2] [HAHA] Đúng rồi, như mình đã nói!" - sẽ quote tin nhắn số 2 trong lịch sử.
Chỉ dùng QUOTE khi thực sự cần nhắc lại tin nhắn cũ có liên quan.

Nếu muốn gửi sticker, thêm [STICKER: keyword] vào cuối câu.
Ví dụ: "[HAHA] Chào bạn! Hôm nay vui quá! [STICKER: hello]"
Các keyword sticker: hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry`;

// Tải hình ảnh và chuyển sang base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (e) {
    console.error("Lỗi tải hình:", e);
    return null;
  }
}

async function getGeminiReply(
  prompt: string,
  imageUrl?: string
): Promise<string> {
  try {
    let contents: any;

    if (imageUrl) {
      const base64Image = await fetchImageAsBase64(imageUrl);
      if (base64Image) {
        contents = [
          { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
          { inlineData: { data: base64Image, mimeType: "image/png" } },
        ];
      } else {
        contents = `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;
      }
    } else {
      contents = `${SYSTEM_PROMPT}\n\nUser: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

// Lấy reaction từ response AI
function getReactionFromResponse(text: string): {
  reaction: any;
  cleanText: string;
} {
  const reactionMap: Record<string, any> = {
    "[HEART]": Reactions.HEART,
    "[HAHA]": Reactions.HAHA,
    "[WOW]": Reactions.WOW,
    "[SAD]": Reactions.SAD,
    "[ANGRY]": Reactions.ANGRY,
    "[LIKE]": Reactions.LIKE,
  };

  let reaction = Reactions.LIKE; // Mặc định
  let cleanText = text;

  for (const [tag, react] of Object.entries(reactionMap)) {
    if (text.includes(tag)) {
      reaction = react;
      cleanText = text.replace(tag, "").trim();
      break;
    }
  }

  return { reaction, cleanText };
}

async function sendResponseWithSticker(
  api: any,
  responseText: string,
  threadId: string,
  originalMessage?: any
): Promise<void> {
  // Lấy reaction từ response
  const { reaction, cleanText: textAfterReaction } =
    getReactionFromResponse(responseText);

  // Thả reaction vào tin nhắn gốc
  if (originalMessage) {
    try {
      await api.addReaction(reaction, originalMessage);
      console.log(`[Bot] 💖 Đã thả reaction!`);
    } catch (e) {
      console.error("[Bot] Lỗi thả reaction:", e);
    }
  }

  // Kiểm tra xem AI có muốn quote tin nhắn cũ không
  const quoteRegex = /\[QUOTE:(\d+)\]/i;
  const quoteMatch = textAfterReaction.match(quoteRegex);
  let messageToQuote = originalMessage;
  let cleanText = textAfterReaction;

  if (quoteMatch) {
    const quoteIndex = parseInt(quoteMatch[1]);
    const history = messageHistory.get(threadId) || [];

    if (quoteIndex >= 0 && quoteIndex < history.length) {
      messageToQuote = history[quoteIndex];
      console.log(`[Bot] 📎 AI muốn quote tin nhắn #${quoteIndex}`);
    }
    cleanText = textAfterReaction.replace(quoteMatch[0], "").trim();
  }

  const stickerRegex = /\[STICKER:\s*(.*?)\]/i;
  const match = cleanText.match(stickerRegex);

  let finalMessage = cleanText;
  let stickerKeyword: string | null = null;

  if (match) {
    stickerKeyword = match[1].trim();
    finalMessage = cleanText.replace(match[0], "").trim();
  }

  if (finalMessage) {
    // Gửi tin nhắn kèm trích dẫn (quote)
    if (messageToQuote?.data) {
      await api.sendMessage(
        { msg: `🤖 AI: ${finalMessage}`, quote: messageToQuote.data },
        threadId,
        ThreadType.User
      );
    } else {
      await api.sendMessage(
        `🤖 AI: ${finalMessage}`,
        threadId,
        ThreadType.User
      );
    }
  }

  if (stickerKeyword) {
    try {
      console.log(`[Bot] 🎨 Tìm sticker: "${stickerKeyword}"`);
      const stickerIds = await api.getStickers(stickerKeyword);

      if (stickerIds && stickerIds.length > 0) {
        const randomId =
          stickerIds[Math.floor(Math.random() * stickerIds.length)];
        const stickerDetails = await api.getStickersDetail(randomId);

        if (stickerDetails && stickerDetails[0]) {
          await new Promise((r) => setTimeout(r, 1000));
          await api.sendSticker(stickerDetails[0], threadId, ThreadType.User);
          console.log(`[Bot] ✅ Đã gửi sticker!`);
        }
      } else {
        console.log(`[Bot] ⚠️ Không tìm thấy sticker cho "${stickerKeyword}"`);
      }
    } catch (e) {
      console.error("[Bot] Lỗi gửi sticker:", e);
    }
  }
}

// Kiểm tra rate limit
function checkRateLimit(threadId: string): boolean {
  const now = Date.now();
  const lastTime = lastMessageTime.get(threadId) || 0;

  if (now - lastTime < RATE_LIMIT_MS) {
    console.log(`[Bot] ⏳ Rate limit: ${threadId} (chờ ${RATE_LIMIT_MS}ms)`);
    return false;
  }

  lastMessageTime.set(threadId, now);
  return true;
}

async function main() {
  console.log("🚀 Đang khởi động Cloud Bot...");
  console.log(
    `📌 Prefix: "${TRIGGER_PREFIX}" (${
      REQUIRE_PREFIX ? "bắt buộc" : "tùy chọn"
    })`
  );
  console.log(`⏱️ Rate limit: ${RATE_LIMIT_MS}ms`);

  const api = await zalo.loginQR({ qrPath: "./qr.png" });

  const myId = api.getContext().uid;
  console.log("✅ Đăng nhập thành công! My ID:", myId);
  console.log("─".repeat(50));

  api.listener.on("message", async (message: any) => {
    const content = message.data?.content;
    const threadId = message.threadId;
    const msgType = message.data?.msgType;
    const isSelf = message.isSelf;

    // Bỏ qua tin nhắn của chính bot (tránh loop)
    if (isSelf) return;

    // Lọc theo tên người gửi
    const senderName = message.data?.dName || "";
    if (ALLOWED_NAME && !senderName.includes(ALLOWED_NAME)) {
      console.log(
        `[Bot] ⏭️ Bỏ qua: "${senderName}" (không phải ${ALLOWED_NAME})`
      );
      return;
    }

    // Kiểm tra rate limit
    if (!checkRateLimit(threadId)) {
      return;
    }

    // --- XỬ LÝ STICKER ---
    if (msgType === "chat.sticker" && content?.id) {
      console.log(`[Bot] 🎨 Nhận sticker ID: ${content.id}`);

      try {
        const stickerDetails = await api.getStickersDetail(content.id);
        const stickerInfo = stickerDetails?.[0];
        const stickerUrl =
          stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;

        const aiPrompt = `Người dùng gửi một sticker (hình biểu cảm). Hãy mô tả ngắn gọn sticker thể hiện cảm xúc gì, rồi phản hồi vui vẻ, tự nhiên.`;

        console.log(`[Bot] 🤖 Cho AI xem sticker...`);
        await api.sendTypingEvent(threadId, ThreadType.User);

        const aiReply = await getGeminiReply(aiPrompt, stickerUrl);
        await sendResponseWithSticker(api, aiReply, threadId, message);
        console.log(`[Bot] ✅ Đã trả lời sticker!`);
      } catch (e) {
        console.error("[Bot] Lỗi xử lý sticker:", e);
      }
      return;
    }

    // --- XỬ LÝ ẢNH ---
    if (msgType === "chat.photo" || (msgType === "webchat" && content?.href)) {
      // Lấy URL ảnh từ content
      const imageUrl = content?.href || content?.hdUrl || content?.thumbUrl;

      if (imageUrl) {
        console.log(`[Bot] 🖼️ Nhận ảnh: ${imageUrl}`);

        try {
          const aiPrompt = `Người dùng gửi một hình ảnh. Hãy mô tả chi tiết hình ảnh này và phản hồi phù hợp.`;

          console.log(`[Bot] 🤖 Cho AI xem ảnh...`);
          await api.sendTypingEvent(threadId, ThreadType.User);

          const aiReply = await getGeminiReply(aiPrompt, imageUrl);
          await sendResponseWithSticker(api, aiReply, threadId, message);
          console.log(`[Bot] ✅ Đã trả lời ảnh!`);
        } catch (e) {
          console.error("[Bot] Lỗi xử lý ảnh:", e);
        }
        return;
      }
    }

    // --- XỬ LÝ VIDEO ---
    if (msgType === "chat.video.msg" && content?.thumb) {
      const thumbUrl = content?.thumb;
      const params = content?.params ? JSON.parse(content.params) : {};
      const duration = params?.duration
        ? Math.round(params.duration / 1000)
        : 0;

      console.log(`[Bot] 🎬 Nhận video: ${duration}s`);

      try {
        const aiPrompt = `Người dùng gửi một video dài ${duration} giây. Đây là ảnh thumbnail của video. Hãy mô tả những gì bạn thấy trong ảnh và đoán nội dung video có thể là gì.`;

        console.log(`[Bot] 🤖 Cho AI xem thumbnail video...`);
        await api.sendTypingEvent(threadId, ThreadType.User);

        const aiReply = await getGeminiReply(aiPrompt, thumbUrl);
        await sendResponseWithSticker(api, aiReply, threadId, message);
        console.log(`[Bot] ✅ Đã trả lời video!`);
      } catch (e) {
        console.error("[Bot] Lỗi xử lý video:", e);
      }
      return;
    }

    // --- XỬ LÝ VOICE ---
    if (msgType === "chat.voice" && content?.href) {
      const audioUrl = content?.href;
      const params = content?.params ? JSON.parse(content.params) : {};
      const duration = params?.duration
        ? Math.round(params.duration / 1000)
        : 0;

      console.log(`[Bot] 🎤 Nhận voice: ${duration}s`);

      try {
        // Tải audio và gửi cho Gemini
        const base64Audio = await fetchImageAsBase64(audioUrl);

        if (base64Audio) {
          console.log(`[Bot] 🤖 Cho AI nghe voice...`);
          await api.sendTypingEvent(threadId, ThreadType.User);

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              {
                text: `${SYSTEM_PROMPT}\n\nNgười dùng gửi một tin nhắn thoại dài ${duration} giây. Hãy nghe và trả lời nội dung họ nói.`,
              },
              { inlineData: { data: base64Audio, mimeType: "audio/aac" } },
            ],
          });

          const aiReply =
            response.text || "Không nghe rõ, bạn nói lại được không?";
          await sendResponseWithSticker(api, aiReply, threadId, message);
          console.log(`[Bot] ✅ Đã trả lời voice!`);
        } else {
          await api.sendMessage(
            "🤖 AI: Không tải được voice, thử lại nhé!",
            threadId,
            ThreadType.User
          );
        }
      } catch (e) {
        console.error("[Bot] Lỗi xử lý voice:", e);
        await api.sendMessage(
          "🤖 AI: Lỗi xử lý voice, thử lại sau nhé!",
          threadId,
          ThreadType.User
        );
      }
      return;
    }

    // DEBUG: Log các loại tin nhắn khác để biết cấu trúc
    if (typeof content !== "string") {
      console.log(
        `[DEBUG] msgType: ${msgType}, content:`,
        JSON.stringify(content, null, 2)
      );
      return;
    }

    let userPrompt = content;

    // Kiểm tra prefix nếu bắt buộc
    if (REQUIRE_PREFIX) {
      if (!content.startsWith(TRIGGER_PREFIX)) return;
      userPrompt = content.replace(TRIGGER_PREFIX, "").trim();
      if (!userPrompt) {
        await api.sendMessage(
          `💡 Cú pháp: ${TRIGGER_PREFIX} <câu hỏi>`,
          threadId,
          ThreadType.User
        );
        return;
      }
    }

    // --- XỬ LÝ TIN NHẮN CÓ TRÍCH DẪN (User reply tin nhắn cũ) ---
    const quoteData = message.data?.quote;
    if (quoteData) {
      const quoteContent =
        quoteData.msg || quoteData.content || "(nội dung không xác định)";
      console.log(`[Bot] 💬 User reply tin nhắn: "${quoteContent}"`);

      // Gộp context: tin nhắn được trích dẫn + câu hỏi hiện tại
      userPrompt = `Người dùng đang trả lời/hỏi về tin nhắn cũ có nội dung: "${quoteContent}"\n\nCâu hỏi/yêu cầu của họ: "${content}"`;
    }

    // Lưu tin nhắn user vào history
    saveMessageToHistory(threadId, message);

    // Lấy lịch sử chat để AI có context
    const historyContext = getHistoryContext(threadId);
    const promptWithHistory = historyContext
      ? `Lịch sử chat gần đây:\n${historyContext}\n\nTin nhắn mới từ User: ${userPrompt}`
      : userPrompt;

    console.log(`[Bot] 📩 Câu hỏi: ${userPrompt}`);
    await api.sendTypingEvent(threadId, ThreadType.User);

    const aiReply = await getGeminiReply(promptWithHistory);
    await sendResponseWithSticker(api, aiReply, threadId, message);

    // Lưu tin nhắn bot vào history (tạo fake message object)
    saveMessageToHistory(threadId, {
      isSelf: true,
      data: { content: aiReply.replace(/\[.*?\]/g, "").trim() },
    });

    console.log(`[Bot] ✅ Đã trả lời.`);
  });

  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});

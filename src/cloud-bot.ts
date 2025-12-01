import * as zcajs from "zca-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Workaround cho TypeScript không nhận export
const { Zalo, ThreadType } = zcajs as any;

// --- CẤU HÌNH ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TRIGGER_PREFIX = "#bot";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const zalo = new Zalo({
  selfListen: true,
  logging: true,
});

// System prompt để AI biết cách gợi ý sticker
const SYSTEM_PROMPT = `Bạn là trợ lý AI vui tính trên Zalo. Trả lời ngắn gọn, tự nhiên.
Nếu muốn thể hiện cảm xúc, thêm tag [STICKER: keyword] vào cuối câu.
Ví dụ: "Chào bạn! [STICKER: hello]" hoặc "Haha vui quá! [STICKER: laugh]"
Các keyword phổ biến: hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry`;

async function getGeminiReply(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

// Xử lý gửi sticker từ response AI
async function sendResponseWithSticker(
  api: any,
  responseText: string,
  threadId: string
): Promise<void> {
  const stickerRegex = /\[STICKER:\s*(.*?)\]/i;
  const match = responseText.match(stickerRegex);

  let finalMessage = responseText;
  let stickerKeyword: string | null = null;

  if (match) {
    stickerKeyword = match[1].trim();
    finalMessage = responseText.replace(match[0], "").trim();
  }

  // Gửi tin nhắn text
  if (finalMessage) {
    await api.sendMessage(`🤖 AI: ${finalMessage}`, threadId, ThreadType.User);
  }

  // Gửi sticker nếu có
  if (stickerKeyword) {
    try {
      console.log(`[Bot] 🎨 Tìm sticker: "${stickerKeyword}"`);
      const stickerIds = await api.getStickers(stickerKeyword);

      if (stickerIds && stickerIds.length > 0) {
        const randomId =
          stickerIds[Math.floor(Math.random() * stickerIds.length)];
        const stickerDetails = await api.getStickersDetail(randomId);

        if (stickerDetails && stickerDetails[0]) {
          // Delay nhẹ cho tự nhiên
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

async function main() {
  console.log("🚀 Đang khởi động Cloud Bot...");
  console.log(`📌 Prefix: "${TRIGGER_PREFIX}"`);

  const api = await zalo.loginQR({ qrPath: "./qr.png" });

  const myId = api.getContext().uid;
  console.log("✅ Đăng nhập thành công! My ID:", myId);
  console.log(`💡 Nhắn: ${TRIGGER_PREFIX} <câu hỏi> để chat với AI`);
  console.log("─".repeat(50));

  api.listener.on("message", async (message: any) => {
    const content = message.data?.content;
    const threadId = message.threadId;

    if (typeof content !== "string") return;
    if (!content.startsWith(TRIGGER_PREFIX)) return;

    const userPrompt = content.replace(TRIGGER_PREFIX, "").trim();
    if (!userPrompt) {
      await api.sendMessage(
        `💡 Cú pháp: ${TRIGGER_PREFIX} <câu hỏi>`,
        threadId,
        ThreadType.User
      );
      return;
    }

    console.log(`[Bot] 📩 Câu hỏi: ${userPrompt}`);
    await api.sendTypingEvent(threadId, ThreadType.User);

    const aiReply = await getGeminiReply(userPrompt);
    await sendResponseWithSticker(api, aiReply, threadId);

    console.log(`[Bot] ✅ Đã trả lời.`);
  });

  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});

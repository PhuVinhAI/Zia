import * as zcajs from "zca-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Workaround cho TypeScript không nhận export
const { Zalo, ThreadType } = zcajs as any;

// --- CẤU HÌNH ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TRIGGER_PREFIX = "#bot"; // Từ khóa để kích hoạt bot

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
  console.error("❌ Vui lòng cấu hình GEMINI_API_KEY trong file .env");
  process.exit(1);
}

// Khởi tạo AI
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Khởi tạo Zalo với selfListen = true để nghe được tin nhắn do chính mình gửi
const zalo = new Zalo({
  selfListen: true,
  logging: true,
});

async function getGeminiReply(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Không có phản hồi từ AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Gemini đang bận, thử lại sau nhé!";
  }
}

async function main() {
  console.log("🚀 Đang khởi động Cloud Bot...");
  console.log(`📌 Prefix kích hoạt: "${TRIGGER_PREFIX}"`);

  // 1. Đăng nhập bằng QR
  const api = await zalo.loginQR({ qrPath: "./qr.png" });

  const myId = api.getContext().uid;
  console.log("✅ Đăng nhập thành công! My ID:", myId);
  console.log(`💡 Nhắn: ${TRIGGER_PREFIX} <câu hỏi> để chat với AI`);
  console.log("─".repeat(50));

  // 2. Lắng nghe tin nhắn
  api.listener.on("message", async (message: any) => {
    const content = message.data?.content;
    const threadId = message.threadId;

    // Chỉ xử lý tin nhắn văn bản bắt đầu bằng prefix (tránh loop vô tận)
    if (typeof content !== "string") return;
    if (!content.startsWith(TRIGGER_PREFIX)) return;

    // Lấy nội dung thực (bỏ prefix)
    const userPrompt = content.replace(TRIGGER_PREFIX, "").trim();
    if (!userPrompt) {
      await api.sendMessage(
        `💡 Cú pháp: ${TRIGGER_PREFIX} <câu hỏi của bạn>`,
        threadId,
        ThreadType.User
      );
      return;
    }

    console.log(`[Bot] 📩 Câu hỏi: ${userPrompt}`);

    // Gửi Typing indicator
    await api.sendTypingEvent(threadId, ThreadType.User);

    // Hỏi AI và trả lời
    const aiReply = await getGeminiReply(userPrompt);
    await api.sendMessage(`🤖 AI: ${aiReply}`, threadId, ThreadType.User);
    console.log(`[Bot] ✅ Đã trả lời.`);
  });

  // Bắt đầu lắng nghe
  api.listener.start();
  console.log("👂 Bot đang lắng nghe...");
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động bot:", err);
  process.exit(1);
});

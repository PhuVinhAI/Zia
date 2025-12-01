import * as zcajs from "zca-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const { Zalo, ThreadType } = zcajs as any;

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

const SYSTEM_PROMPT = `Bạn là trợ lý AI vui tính trên Zalo. Trả lời ngắn gọn, tự nhiên.
Nếu muốn thể hiện cảm xúc, thêm tag [STICKER: keyword] vào cuối câu.
Ví dụ: "Chào bạn! [STICKER: hello]" hoặc "Haha vui quá! [STICKER: haha]"
Các keyword phổ biến: hello, hi, love, haha, sad, cry, angry, wow, ok, thanks, sorry`;

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

  if (finalMessage) {
    await api.sendMessage(`🤖 AI: ${finalMessage}`, threadId, ThreadType.User);
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
        await sendResponseWithSticker(api, aiReply, threadId);
        console.log(`[Bot] ✅ Đã trả lời sticker!`);
      } catch (e) {
        console.error("[Bot] Lỗi xử lý sticker:", e);
      }
      return;
    }

    // --- XỬ LÝ TEXT ---
    if (typeof content !== "string") return;

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

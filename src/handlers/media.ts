import { ThreadType } from "../services/zalo.js";
import {
  generateWithImage,
  generateWithAudio,
  generateWithFile,
  generateWithVideo,
} from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { CONFIG, PROMPTS } from "../config/index.js";

export async function handleSticker(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  console.log(`[Bot] 🎨 Nhận sticker ID: ${content.id}`);

  try {
    const stickerDetails = await api.getStickersDetail(content.id);
    const stickerInfo = stickerDetails?.[0];
    const stickerUrl = stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;

    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithImage(PROMPTS.sticker, stickerUrl);
    await sendResponse(api, aiReply, threadId, message);
    console.log(`[Bot] ✅ Đã trả lời sticker!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý sticker:", e);
  }
}

export async function handleImage(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const imageUrl = content?.href || content?.hdUrl || content?.thumbUrl;

  console.log(`[Bot] 🖼️ Nhận ảnh`);

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithImage(PROMPTS.image, imageUrl);
    await sendResponse(api, aiReply, threadId, message);
    console.log(`[Bot] ✅ Đã trả lời ảnh!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý ảnh:", e);
  }
}

export async function handleVideo(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const videoUrl = content?.href || content?.hdUrl;
  const thumbUrl = content?.thumb;
  const params = content?.params ? JSON.parse(content.params) : {};
  const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
  const fileSize = params?.fileSize ? parseInt(params.fileSize) : 0;

  console.log(
    `[Bot] 🎬 Nhận video: ${duration}s, ${Math.round(fileSize / 1024 / 1024)}MB`
  );

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);

    // Nếu video dưới 20MB thì gửi video thật, không thì dùng thumbnail
    if (videoUrl && fileSize > 0 && fileSize < 20 * 1024 * 1024) {
      console.log(`[Bot] 📹 Gửi video thật cho AI xem`);
      const aiReply = await generateWithVideo(
        PROMPTS.video(duration),
        videoUrl,
        "video/mp4"
      );
      await sendResponse(api, aiReply, threadId, message);
    } else {
      console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
      const aiReply = await generateWithImage(
        PROMPTS.videoThumb(duration),
        thumbUrl
      );
      await sendResponse(api, aiReply, threadId, message);
    }

    console.log(`[Bot] ✅ Đã trả lời video!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý video:", e);
  }
}

export async function handleVoice(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const audioUrl = content?.href;
  const params = content?.params ? JSON.parse(content.params) : {};
  const duration = params?.duration ? Math.round(params.duration / 1000) : 0;

  console.log(`[Bot] 🎤 Nhận voice: ${duration}s`);

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithAudio(
      PROMPTS.voice(duration),
      audioUrl,
      "audio/aac"
    );
    await sendResponse(api, aiReply, threadId, message);
    console.log(`[Bot] ✅ Đã trả lời voice!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý voice:", e);
  }
}

export async function handleFile(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const fileName = content?.title || "file";
  const fileUrl = content?.href;
  const params = content?.params ? JSON.parse(content.params) : {};
  const fileExt = (params?.fileExt?.toLowerCase() || "").replace(".", "");
  const fileSize = params?.fileSize
    ? Math.round(parseInt(params.fileSize) / 1024)
    : 0;

  console.log(`[Bot] 📄 Nhận file: ${fileName} (.${fileExt}, ${fileSize}KB)`);

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);

    const {
      isGeminiSupported,
      isTextConvertible,
      fetchAndConvertToTextBase64,
    } = await import("../utils/fetch.js");
    const { generateContent, generateWithBase64 } = await import(
      "../services/gemini.js"
    );

    // 1. Nếu Gemini hỗ trợ native → gửi trực tiếp
    if (isGeminiSupported(fileExt)) {
      const mimeType = CONFIG.mimeTypes[fileExt] || "application/octet-stream";
      console.log(`[Bot] ✅ Gemini hỗ trợ native: ${fileExt}`);
      const aiReply = await generateWithFile(
        PROMPTS.file(fileName, fileSize),
        fileUrl,
        mimeType
      );
      await sendResponse(api, aiReply, threadId, message);
    }
    // 2. Nếu có thể convert sang text → convert sang .txt và gửi như file thường
    else if (isTextConvertible(fileExt)) {
      console.log(`[Bot] 📝 Convert sang .txt: ${fileExt}`);
      const base64Text = await fetchAndConvertToTextBase64(fileUrl);
      if (base64Text) {
        // Gửi như file .txt thường (text/plain) - truyền base64 trực tiếp
        const aiReply = await generateWithBase64(
          PROMPTS.fileText(fileName, fileExt, fileSize),
          base64Text,
          "text/plain"
        );
        await sendResponse(api, aiReply, threadId, message);
      } else {
        const aiReply = await generateContent(
          PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
        );
        await sendResponse(api, aiReply, threadId, message);
      }
    }
    // 3. Không hỗ trợ
    else {
      console.log(`[Bot] ❌ Không hỗ trợ: ${fileExt}`);
      const aiReply = await generateContent(
        PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
      );
      await sendResponse(api, aiReply, threadId, message);
    }

    console.log(`[Bot] ✅ Đã trả lời file!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý file:", e);
  }
}

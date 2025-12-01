import { ThreadType } from "../services/zalo.js";
import {
  generateWithImage,
  generateWithAudio,
  generateWithFile,
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
  const thumbUrl = content?.thumb;
  const params = content?.params ? JSON.parse(content.params) : {};
  const duration = params?.duration ? Math.round(params.duration / 1000) : 0;

  console.log(`[Bot] 🎬 Nhận video: ${duration}s`);

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithImage(PROMPTS.video(duration), thumbUrl);
    await sendResponse(api, aiReply, threadId, message);
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
  const fileExt = params?.fileExt?.toLowerCase() || "";
  const fileSize = params?.fileSize
    ? Math.round(parseInt(params.fileSize) / 1024)
    : 0;

  console.log(`[Bot] 📄 Nhận file: ${fileName} (${fileSize}KB)`);

  try {
    await api.sendTypingEvent(threadId, ThreadType.User);

    if (CONFIG.readableFormats.includes(fileExt)) {
      const mimeType = CONFIG.mimeTypes[fileExt] || "application/octet-stream";
      const aiReply = await generateWithFile(
        PROMPTS.file(fileName, fileSize),
        fileUrl,
        mimeType
      );
      await sendResponse(api, aiReply, threadId, message);
      console.log(`[Bot] ✅ Đã trả lời file!`);
    } else {
      const { generateContent } = await import("../services/gemini.js");
      const aiReply = await generateContent(
        PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
      );
      await sendResponse(api, aiReply, threadId, message);
      console.log(`[Bot] ✅ Đã trả lời file (không đọc được)!`);
    }
  } catch (e) {
    console.error("[Bot] Lỗi xử lý file:", e);
  }
}

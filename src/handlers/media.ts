import { ThreadType } from "../services/zalo.js";
import {
  generateWithImage,
  generateWithAudio,
  generateWithFile,
  generateWithVideo,
} from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { CONFIG, PROMPTS } from "../config/index.js";
import { saveToHistory, saveResponseToHistory } from "../utils/history.js";

export async function handleSticker(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  console.log(`[Bot] 🎨 Nhận sticker ID: ${content.id}`);

  try {
    // Lưu sticker vào history
    await saveToHistory(threadId, message);

    const stickerDetails = await api.getStickersDetail(content.id);
    const stickerInfo = stickerDetails?.[0];
    const stickerUrl = stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;

    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithImage(PROMPTS.sticker, stickerUrl);
    await sendResponse(api, aiReply, threadId, message);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

    console.log(`[Bot] ✅ Đã trả lời sticker!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý sticker:", e);
  }
}

export async function handleImage(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  const imageUrl = content?.href || content?.hdUrl || content?.thumbUrl;
  const caption = content?.title || content?.desc || ""; // Caption kèm ảnh

  if (caption) {
    console.log(`[Bot] 🖼️ Nhận ảnh + caption: "${caption}"`);
  } else {
    console.log(`[Bot] 🖼️ Nhận ảnh`);
  }

  try {
    // Lưu ảnh vào history
    await saveToHistory(threadId, message);

    await api.sendTypingEvent(threadId, ThreadType.User);

    // Nếu có caption → dùng caption làm prompt, không thì dùng prompt mặc định
    const prompt = caption ? PROMPTS.imageWithCaption(caption) : PROMPTS.image;

    const aiReply = await generateWithImage(prompt, imageUrl);
    await sendResponse(api, aiReply, threadId, message);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

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
  const caption = content?.title || content?.desc || ""; // Caption kèm video

  if (caption) {
    console.log(
      `[Bot] 🎬 Nhận video: ${duration}s, ${Math.round(
        fileSize / 1024 / 1024
      )}MB + caption: "${caption}"`
    );
  } else {
    console.log(
      `[Bot] 🎬 Nhận video: ${duration}s, ${Math.round(
        fileSize / 1024 / 1024
      )}MB`
    );
  }

  try {
    // Lưu video vào history
    await saveToHistory(threadId, message);

    await api.sendTypingEvent(threadId, ThreadType.User);

    let aiReply;
    // Nếu video dưới 20MB thì gửi video thật, không thì dùng thumbnail
    if (videoUrl && fileSize > 0 && fileSize < 20 * 1024 * 1024) {
      console.log(`[Bot] � GVửi video thật cho AI xem`);
      const prompt = caption
        ? PROMPTS.videoWithCaption(duration, caption)
        : PROMPTS.video(duration);
      aiReply = await generateWithVideo(prompt, videoUrl, "video/mp4");
    } else {
      console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
      const prompt = caption
        ? PROMPTS.videoThumbWithCaption(duration, caption)
        : PROMPTS.videoThumb(duration);
      aiReply = await generateWithImage(prompt, thumbUrl);
    }
    await sendResponse(api, aiReply, threadId, message);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

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
    // Lưu voice vào history
    await saveToHistory(threadId, message);

    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await generateWithAudio(
      PROMPTS.voice(duration),
      audioUrl,
      "audio/aac"
    );
    await sendResponse(api, aiReply, threadId, message);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

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
    // Lưu file vào history
    await saveToHistory(threadId, message);

    await api.sendTypingEvent(threadId, ThreadType.User);

    const {
      isGeminiSupported,
      isTextConvertible,
      fetchAndConvertToTextBase64,
    } = await import("../utils/fetch.js");
    const { generateContent, generateWithBase64 } = await import(
      "../services/gemini.js"
    );

    let aiReply;
    const mimeType = CONFIG.mimeTypes[fileExt] || "application/octet-stream";

    // 1. Nếu Gemini hỗ trợ native → gửi trực tiếp
    if (isGeminiSupported(fileExt)) {
      console.log(`[Bot] ✅ Gemini hỗ trợ native: ${fileExt}`);

      // Dùng prompt phù hợp với loại file
      let prompt: string;
      if (mimeType.startsWith("video/")) {
        // Video file → dùng prompt video
        const duration = 0; // Không biết duration từ file attachment
        prompt = PROMPTS.video(duration);
        console.log(`[Bot] 🎬 Xử lý như video`);
      } else if (mimeType.startsWith("audio/")) {
        // Audio file → dùng prompt voice
        const duration = 0;
        prompt = PROMPTS.voice(duration);
        console.log(`[Bot] 🎤 Xử lý như audio`);
      } else {
        // Các file khác (PDF, HTML, text...)
        prompt = PROMPTS.file(fileName, fileSize);
      }

      aiReply = await generateWithFile(prompt, fileUrl, mimeType);
    }
    // 2. Nếu có thể convert sang text → convert sang .txt và gửi như file thường
    else if (isTextConvertible(fileExt)) {
      console.log(`[Bot] 📝 Convert sang .txt: ${fileExt}`);
      const base64Text = await fetchAndConvertToTextBase64(fileUrl);
      if (base64Text) {
        aiReply = await generateWithBase64(
          PROMPTS.fileText(fileName, fileExt, fileSize),
          base64Text,
          "text/plain"
        );
      } else {
        aiReply = await generateContent(
          PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
        );
      }
    }
    // 3. Không hỗ trợ
    else {
      console.log(`[Bot] ❌ Không hỗ trợ: ${fileExt}`);
      aiReply = await generateContent(
        PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
      );
    }

    await sendResponse(api, aiReply, threadId, message);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

    console.log(`[Bot] ✅ Đã trả lời file!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý file:", e);
  }
}

/**
 * Xử lý nhiều ảnh cùng lúc
 */
export async function handleMultipleImages(
  api: any,
  messages: any[],
  threadId: string,
  caption?: string
) {
  const { generateWithMultipleImages } = await import("../services/gemini.js");

  console.log(
    `[Bot] 🖼️ Nhận ${messages.length} ảnh${
      caption ? ` + caption: "${caption}"` : ""
    }`
  );

  try {
    // Lưu tất cả ảnh vào history
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    await api.sendTypingEvent(threadId, ThreadType.User);

    // Lấy URLs của tất cả ảnh
    const imageUrls = messages
      .map((msg) => {
        const content = msg.data?.content;
        return content?.href || content?.hdUrl || content?.thumbUrl;
      })
      .filter(Boolean);

    // Tạo prompt phù hợp
    const prompt = caption
      ? PROMPTS.multipleImagesWithCaption(imageUrls.length, caption)
      : PROMPTS.multipleImages(imageUrls.length);

    const aiReply = await generateWithMultipleImages(prompt, imageUrls);
    await sendResponse(api, aiReply, threadId, messages[messages.length - 1]);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

    console.log(`[Bot] ✅ Đã trả lời ${messages.length} ảnh!`);
  } catch (e) {
    console.error("[Bot] Lỗi xử lý nhiều ảnh:", e);
  }
}

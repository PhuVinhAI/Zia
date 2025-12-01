import { ThreadType } from "../services/zalo.js";
import { getGeminiReply, ai } from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { fetchAsBase64 } from "../utils/fetch.js";
import { CONFIG, SYSTEM_PROMPT, PROMPTS } from "../config/index.js";

export async function handleSticker(api: any, message: any, threadId: string) {
  const content = message.data?.content;
  console.log(`[Bot] 🎨 Nhận sticker ID: ${content.id}`);

  try {
    const stickerDetails = await api.getStickersDetail(content.id);
    const stickerInfo = stickerDetails?.[0];
    const stickerUrl = stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;

    await api.sendTypingEvent(threadId, ThreadType.User);
    const aiReply = await getGeminiReply(PROMPTS.sticker, stickerUrl);
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
    const aiReply = await getGeminiReply(PROMPTS.image, imageUrl);
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
    const aiReply = await getGeminiReply(PROMPTS.video(duration), thumbUrl);
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
    const base64Audio = await fetchAsBase64(audioUrl);

    if (base64Audio) {
      await api.sendTypingEvent(threadId, ThreadType.User);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: `${SYSTEM_PROMPT}\n\n${PROMPTS.voice(duration)}` },
          { inlineData: { data: base64Audio, mimeType: "audio/aac" } },
        ],
      });

      const aiReply = response.text || "Không nghe rõ, bạn nói lại được không?";
      await sendResponse(api, aiReply, threadId, message);
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
    if (CONFIG.readableFormats.includes(fileExt)) {
      const base64File = await fetchAsBase64(fileUrl);

      if (base64File) {
        await api.sendTypingEvent(threadId, ThreadType.User);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { text: `${SYSTEM_PROMPT}\n\n${PROMPTS.file(fileName, fileSize)}` },
            {
              inlineData: {
                data: base64File,
                mimeType:
                  CONFIG.mimeTypes[fileExt] || "application/octet-stream",
              },
            },
          ],
        });

        const aiReply = response.text || "Không đọc được file này.";
        await sendResponse(api, aiReply, threadId, message);
        console.log(`[Bot] ✅ Đã trả lời file!`);
      } else {
        await api.sendMessage(
          `🤖 AI: Không tải được file "${fileName}"!`,
          threadId,
          ThreadType.User
        );
      }
    } else {
      await api.sendTypingEvent(threadId, ThreadType.User);
      const aiReply = await getGeminiReply(
        PROMPTS.fileUnreadable(fileName, fileExt, fileSize)
      );
      await sendResponse(api, aiReply, threadId, message);
    }
  } catch (e) {
    console.error("[Bot] Lỗi xử lý file:", e);
  }
}

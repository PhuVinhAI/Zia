import { ThreadType } from "../services/zalo.js";
import {
  generateContent,
  generateContentStream,
  extractYouTubeUrls,
  MediaPart,
  StreamCallbacks,
} from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { createStreamCallbacks } from "./streamResponse.js";
import {
  saveToHistory,
  saveResponseToHistory,
  getHistoryContext,
} from "../utils/history.js";
import { logStep, logError, debugLog } from "../utils/logger.js";
import { CONFIG, PROMPTS } from "../config/index.js";
import {
  isGeminiSupported,
  isTextConvertible,
  fetchAndConvertToTextBase64,
} from "../utils/fetch.js";

/**
 * Phân loại chi tiết tin nhắn
 */
export type MessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "file"
  | "sticker"
  | "link"
  | "unknown";

export interface ClassifiedMessage {
  type: MessageType;
  message: any;
  text?: string;
  url?: string;
  thumbUrl?: string;
  mimeType?: string;
  duration?: number;
  fileSize?: number;
  fileName?: string;
  fileExt?: string;
  stickerId?: string;
}

/**
 * Phân loại tin nhắn chi tiết
 */
export function classifyMessageDetailed(msg: any): ClassifiedMessage {
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || "";

  if (typeof content === "string" && !msgType.includes("sticker")) {
    return { type: "text", message: msg, text: content };
  }

  if (msgType === "chat.sticker" && content?.id) {
    return { type: "sticker", message: msg, stickerId: content.id };
  }

  if (msgType === "chat.photo" || (msgType === "webchat" && content?.href)) {
    const url = content?.href || content?.hdUrl || content?.thumbUrl;
    return { type: "image", message: msg, url, mimeType: "image/jpeg" };
  }

  if (msgType === "chat.video.msg" && content?.thumb) {
    const url = content?.href || content?.hdUrl;
    const thumbUrl = content?.thumb;
    const params = content?.params ? JSON.parse(content.params) : {};
    const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
    const fileSize = params?.fileSize ? parseInt(params.fileSize) : 0;
    return {
      type: "video",
      message: msg,
      url,
      thumbUrl,
      mimeType: "video/mp4",
      duration,
      fileSize,
    };
  }

  if (msgType === "chat.voice" && content?.href) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
    return {
      type: "voice",
      message: msg,
      url: content.href,
      mimeType: "audio/aac",
      duration,
    };
  }

  if (msgType === "share.file" && content?.href) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const fileExt = (params?.fileExt?.toLowerCase() || "").replace(".", "");
    const fileSize = params?.fileSize ? parseInt(params.fileSize) : 0;
    return {
      type: "file",
      message: msg,
      url: content.href,
      fileName: content.title || "file",
      fileExt,
      fileSize,
      mimeType: getMimeType(fileExt),
    };
  }

  if (msgType === "chat.recommended") {
    let url = content?.href;
    if (!url && content?.params) {
      try {
        const params = JSON.parse(content.params);
        url = params?.href;
      } catch {}
    }
    if (url) {
      return { type: "link", message: msg, url, text: url };
    }
  }

  return { type: "unknown", message: msg };
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function buildMixedPrompt(classified: ClassifiedMessage[]): string {
  const parts: string[] = [];

  classified.forEach((item, index) => {
    switch (item.type) {
      case "text":
        parts.push(`[${index}] Tin nhắn: "${item.text}"`);
        break;
      case "sticker":
        parts.push(`[${index}] Sticker: (xem hình sticker đính kèm)`);
        break;
      case "image":
        parts.push(`[${index}] Ảnh: (xem hình ảnh đính kèm)`);
        break;
      case "video":
        parts.push(
          `[${index}] Video ${item.duration || 0}s: (xem video đính kèm)`
        );
        break;
      case "voice":
        parts.push(
          `[${index}] Tin nhắn thoại ${
            item.duration || 0
          }s: (nghe audio đính kèm)`
        );
        break;
      case "file":
        parts.push(`[${index}] File "${item.fileName}": (đọc file đính kèm)`);
        break;
      case "link":
        parts.push(`[${index}] Link: ${item.url}`);
        break;
    }
  });

  return `Người dùng gửi ${
    classified.length
  } nội dung theo thứ tự (số trong ngoặc vuông là INDEX):
${parts.join("\n")}

HƯỚNG DẪN:
- Dùng [quote:INDEX]nội dung[/quote] để reply vào tin nhắn cụ thể
- Dùng [reaction:INDEX:loại] để thả reaction vào tin cụ thể
- Nếu không cần quote/react tin cụ thể, cứ trả lời bình thường

Hãy XEM/NGHE tất cả nội dung đính kèm và phản hồi phù hợp.`;
}

function checkPrefix(content: string): {
  shouldProcess: boolean;
  userPrompt: string;
} {
  if (!CONFIG.requirePrefix)
    return { shouldProcess: true, userPrompt: content };
  if (!content.startsWith(CONFIG.prefix))
    return { shouldProcess: false, userPrompt: "" };
  const userPrompt = content.replace(CONFIG.prefix, "").trim();
  return { shouldProcess: userPrompt.length > 0, userPrompt };
}

function processQuoteInText(message: any, userPrompt: string): string {
  const quoteData = message.data?.quote;
  if (quoteData) {
    const quoteContent =
      quoteData.msg || quoteData.content || "(nội dung không xác định)";
    console.log(`[Bot] 💬 User reply: "${quoteContent}"`);
    return PROMPTS.quote(quoteContent, userPrompt);
  }
  return userPrompt;
}

/**
 * Chuẩn bị MediaPart[] cho generateContent
 */
async function prepareMediaParts(
  api: any,
  classified: ClassifiedMessage[]
): Promise<{ media: MediaPart[]; extraPrompts: string[] }> {
  const media: MediaPart[] = [];
  const extraPrompts: string[] = [];

  for (const item of classified) {
    if (item.type === "sticker" && item.stickerId) {
      try {
        const stickerDetails = await api.getStickersDetail(item.stickerId);
        const stickerInfo = stickerDetails?.[0];
        const stickerUrl =
          stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;
        if (stickerUrl) {
          media.push({ type: "image", url: stickerUrl, mimeType: "image/png" });
        }
      } catch (e) {
        debugLog("MIXED", `Failed to get sticker ${item.stickerId}`);
      }
    } else if (item.type === "image" && item.url) {
      media.push({
        type: "image",
        url: item.url,
        mimeType: item.mimeType || "image/jpeg",
      });
    } else if (item.type === "video") {
      // Video dưới 20MB → gửi video thật, không thì dùng thumbnail
      if (item.url && item.fileSize && item.fileSize < 20 * 1024 * 1024) {
        media.push({ type: "video", url: item.url, mimeType: "video/mp4" });
      } else if (item.thumbUrl) {
        console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
        media.push({
          type: "image",
          url: item.thumbUrl,
          mimeType: "image/jpeg",
        });
        extraPrompts.push(
          `(Video ${item.duration || 0}s quá lớn, chỉ có thumbnail)`
        );
      }
    } else if (item.type === "voice" && item.url) {
      media.push({
        type: "audio",
        url: item.url,
        mimeType: item.mimeType || "audio/aac",
      });
    } else if (item.type === "file" && item.url && item.fileExt) {
      const fileExt = item.fileExt;
      const mimeType = item.mimeType || "application/octet-stream";

      if (isGeminiSupported(fileExt)) {
        media.push({ type: "file", url: item.url, mimeType });
      } else if (isTextConvertible(fileExt)) {
        console.log(`[Bot] 📝 Convert file sang text: ${fileExt}`);
        const base64Text = await fetchAndConvertToTextBase64(item.url);
        if (base64Text) {
          media.push({
            type: "file",
            base64: base64Text,
            mimeType: "text/plain",
          });
        } else {
          extraPrompts.push(
            `(File "${item.fileName}" không đọc được nội dung)`
          );
        }
      } else {
        extraPrompts.push(
          `(File "${item.fileName}" định dạng .${fileExt} không hỗ trợ)`
        );
      }
    }
  }

  return { media, extraPrompts };
}

/**
 * Handler CHÍNH - xử lý TẤT CẢ loại tin nhắn
 */
export async function handleMixedContent(
  api: any,
  messages: any[],
  threadId: string,
  signal?: AbortSignal
) {
  const classified = messages.map(classifyMessageDetailed);

  const counts = {
    text: classified.filter((c) => c.type === "text").length,
    image: classified.filter((c) => c.type === "image").length,
    video: classified.filter((c) => c.type === "video").length,
    voice: classified.filter((c) => c.type === "voice").length,
    file: classified.filter((c) => c.type === "file").length,
    sticker: classified.filter((c) => c.type === "sticker").length,
    link: classified.filter((c) => c.type === "link").length,
  };

  const hasMedia =
    counts.image + counts.video + counts.voice + counts.file + counts.sticker >
    0;
  const isTextOnly = !hasMedia && counts.text > 0;

  console.log(
    `[Bot] 📦 Xử lý ${messages.length} tin nhắn: ` +
      Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")
  );

  logStep("handleMixedContent", { threadId, counts, total: messages.length });

  try {
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    if (signal?.aborted) {
      debugLog("MIXED", "Aborted before processing");
      return;
    }

    await api.sendTypingEvent(threadId, ThreadType.User);

    // ========== TEXT-ONLY ==========
    if (isTextOnly) {
      const allTexts = classified
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .filter(Boolean);
      let combinedText = allTexts.join("\n");

      const { shouldProcess, userPrompt } = checkPrefix(combinedText);
      if (!shouldProcess) {
        if (CONFIG.requirePrefix) {
          await api.sendMessage(
            `💡 Cú pháp: ${CONFIG.prefix} <câu hỏi>`,
            threadId,
            ThreadType.User
          );
        }
        return;
      }

      const lastMsg = messages[messages.length - 1];
      let finalPrompt = processQuoteInText(lastMsg, userPrompt);

      const historyContext = getHistoryContext(threadId);
      if (historyContext) {
        finalPrompt = `Lịch sử chat gần đây:\n${historyContext}\n\nTin nhắn mới từ User: ${finalPrompt}`;
      }

      // Check YouTube
      const youtubeUrls = extractYouTubeUrls(combinedText);
      let ytMedia: MediaPart[] | undefined;
      let promptToUse = finalPrompt;

      if (youtubeUrls.length > 0) {
        console.log(`[Bot] 🎬 Phát hiện ${youtubeUrls.length} YouTube video`);
        promptToUse = PROMPTS.youtube(youtubeUrls, combinedText);
        ytMedia = youtubeUrls.map((url) => ({ type: "youtube", url }));
      }

      if (signal?.aborted) return;

      // Dùng streaming nếu bật
      if (CONFIG.useStreaming) {
        const callbacks = createStreamCallbacks(
          api,
          threadId,
          lastMsg,
          messages
        );
        callbacks.signal = signal;
        await generateContentStream(promptToUse, callbacks, ytMedia);
        console.log(`[Bot] ✅ Đã trả lời text (streaming)!`);
      } else {
        const aiReply = await generateContent(promptToUse, ytMedia);
        if (signal?.aborted) return;
        await sendResponse(api, aiReply, threadId, lastMsg, messages);
        const responseText = aiReply.messages
          .map((m) => m.text)
          .filter(Boolean)
          .join(" ");
        await saveResponseToHistory(threadId, responseText);
        console.log(`[Bot] ✅ Đã trả lời text!`);
      }
      return;
    }

    // ========== CÓ MEDIA ==========
    const { media, extraPrompts } = await prepareMediaParts(api, classified);

    if (signal?.aborted) return;

    let prompt = buildMixedPrompt(classified);
    if (extraPrompts.length > 0) {
      prompt += "\n\nLưu ý: " + extraPrompts.join(", ");
    }

    debugLog("MIXED", `Prompt: ${prompt.substring(0, 200)}...`);
    debugLog("MIXED", `Media parts: ${media.length}`);

    // Dùng streaming nếu bật
    if (CONFIG.useStreaming) {
      const callbacks = createStreamCallbacks(
        api,
        threadId,
        messages[messages.length - 1],
        messages
      );
      callbacks.signal = signal;
      await generateContentStream(
        prompt,
        callbacks,
        media.length > 0 ? media : undefined
      );
      console.log(
        `[Bot] ✅ Đã trả lời ${messages.length} tin nhắn (streaming)!`
      );
    } else {
      const aiReply = await generateContent(
        prompt,
        media.length > 0 ? media : undefined
      );
      if (signal?.aborted) return;
      await sendResponse(
        api,
        aiReply,
        threadId,
        messages[messages.length - 1],
        messages
      );
      const responseText = aiReply.messages
        .map((m) => m.text)
        .filter(Boolean)
        .join(" ");
      await saveResponseToHistory(threadId, responseText);
      console.log(`[Bot] ✅ Đã trả lời ${messages.length} tin nhắn!`);
    }

    console.log(`[Bot] ✅ Đã trả lời ${messages.length} tin nhắn!`);
  } catch (e: any) {
    if (e.message === "Aborted" || signal?.aborted) {
      debugLog("MIXED", "Aborted during processing");
      return;
    }
    logError("handleMixedContent", e);
    console.error("[Bot] Lỗi xử lý mixed content:", e);
  }
}

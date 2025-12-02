import { ThreadType } from "../services/zalo.js";
import {
  generateContent,
  generateContentStream,
  extractYouTubeUrls,
  MediaPart,
} from "../services/gemini.js";
import { sendResponse, createStreamCallbacks } from "./response.js";
import {
  saveToHistory,
  saveResponseToHistory,
  getHistory,
} from "../utils/history.js";
import { logStep, logError, debugLog } from "../utils/logger.js";
import { CONFIG, PROMPTS } from "../config/index.js";
import {
  isGeminiSupported,
  isTextConvertible,
  fetchAndConvertToTextBase64,
} from "../utils/fetch.js";
import { checkRateLimit, markApiCall } from "../utils/rateLimit.js";

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
    const mimeType = CONFIG.mimeTypes[fileExt] || "application/octet-stream";
    return {
      type: "file",
      message: msg,
      url: content.href,
      fileName: content.title || "file",
      fileExt,
      fileSize,
      mimeType,
    };
  }

  if (msgType === "chat.recommended") {
    let url = content?.href;
    if (!url && content?.params) {
      try {
        url = JSON.parse(content.params)?.href;
      } catch {}
    }
    if (url) return { type: "link", message: msg, url, text: url };
  }

  return { type: "unknown", message: msg };
}

/**
 * Chuẩn bị MediaPart[] từ classified messages
 */
async function prepareMediaParts(
  api: any,
  classified: ClassifiedMessage[]
): Promise<{ media: MediaPart[]; notes: string[] }> {
  const media: MediaPart[] = [];
  const notes: string[] = [];

  for (const item of classified) {
    if (item.type === "sticker" && item.stickerId) {
      try {
        const details = await api.getStickersDetail(item.stickerId);
        const url = details?.[0]?.stickerUrl || details?.[0]?.stickerSpriteUrl;
        if (url) media.push({ type: "image", url, mimeType: "image/png" });
      } catch {
        debugLog("MIXED", `Failed to get sticker ${item.stickerId}`);
      }
    } else if (item.type === "image" && item.url) {
      media.push({
        type: "image",
        url: item.url,
        mimeType: item.mimeType || "image/jpeg",
      });
    } else if (item.type === "video") {
      if (item.url && item.fileSize && item.fileSize < 20 * 1024 * 1024) {
        media.push({ type: "video", url: item.url, mimeType: "video/mp4" });
      } else if (item.thumbUrl) {
        console.log(`[Bot] 🖼️ Video quá lớn, dùng thumbnail`);
        media.push({
          type: "image",
          url: item.thumbUrl,
          mimeType: "image/jpeg",
        });
        notes.push(`(Video ${item.duration || 0}s quá lớn, chỉ có thumbnail)`);
      }
    } else if (item.type === "voice" && item.url) {
      media.push({
        type: "audio",
        url: item.url,
        mimeType: item.mimeType || "audio/aac",
      });
    } else if (item.type === "file" && item.url && item.fileExt) {
      if (isGeminiSupported(item.fileExt)) {
        media.push({
          type: "file",
          url: item.url,
          mimeType: item.mimeType || "application/octet-stream",
        });
      } else if (isTextConvertible(item.fileExt)) {
        console.log(`[Bot] 📝 Convert file sang text: ${item.fileExt}`);
        const base64 = await fetchAndConvertToTextBase64(item.url);
        if (base64)
          media.push({ type: "file", base64, mimeType: "text/plain" });
        else notes.push(`(File "${item.fileName}" không đọc được)`);
      } else {
        notes.push(
          `(File "${item.fileName}" định dạng .${item.fileExt} không hỗ trợ)`
        );
      }
    }
  }

  return { media, notes };
}

/**
 * Build prompt thống nhất cho mọi loại tin nhắn
 */
function buildPrompt(
  classified: ClassifiedMessage[],
  userText: string,
  quoteContent: string | null,
  youtubeUrls: string[],
  mediaNotes: string[]
): string {
  const hasMedia = classified.some((c) =>
    ["image", "video", "voice", "file", "sticker"].includes(c.type)
  );

  let prompt: string;

  if (hasMedia) {
    // Có media → dùng mixedContent prompt
    const items = classified.map((c) => ({
      type: c.type,
      text: c.text,
      url: c.url,
      duration: c.duration,
      fileName: c.fileName,
    }));
    prompt = PROMPTS.mixedContent(items);
    prompt += PROMPTS.mediaNote(mediaNotes);
  } else {
    // Text only → dùng userText trực tiếp
    prompt = userText;
  }

  // Thêm quote context
  if (quoteContent) {
    prompt += PROMPTS.quoteContext(quoteContent);
  }

  // Thêm YouTube context
  if (youtubeUrls.length > 0) {
    if (hasMedia) {
      prompt += PROMPTS.youtubeInBatch(youtubeUrls);
    } else {
      // Text-only với YouTube → override prompt
      prompt = PROMPTS.youtube(youtubeUrls, userText);
    }
  }

  return prompt;
}

/**
 * Handler CHÍNH - xử lý TẤT CẢ loại tin nhắn trong 1 flow duy nhất
 */
export async function handleMixedContent(
  api: any,
  messages: any[],
  threadId: string,
  signal?: AbortSignal
) {
  // 1. Phân loại tất cả tin nhắn
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

  console.log(
    `[Bot] 📦 Xử lý ${messages.length} tin nhắn: ` +
      Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")
  );
  logStep("handleMixedContent", { threadId, counts, total: messages.length });

  try {
    // 2. Lưu vào history
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    if (signal?.aborted) return debugLog("MIXED", "Aborted before processing");

    await api.sendTypingEvent(threadId, ThreadType.User);

    // 3. Lấy history và context
    const history = getHistory(threadId);
    const lastMsg = messages[messages.length - 1];
    const quoteContent = lastMsg.data?.quote
      ? lastMsg.data.quote.msg ||
        lastMsg.data.quote.content ||
        "(nội dung không xác định)"
      : null;
    if (quoteContent) console.log(`[Bot] 💬 User reply: "${quoteContent}"`);

    // 4. Lấy text từ tất cả tin nhắn
    const allTexts = classified
      .filter((c) => c.type === "text" || c.type === "link")
      .map((c) => c.text || c.url || "")
      .filter(Boolean);
    const combinedText = allTexts.join("\n");

    // 5. Check prefix (chỉ áp dụng cho text)
    if (combinedText && CONFIG.requirePrefix) {
      if (!combinedText.startsWith(CONFIG.prefix)) {
        await api.sendMessage(
          PROMPTS.prefixHint(CONFIG.prefix),
          threadId,
          ThreadType.User
        );
        return;
      }
    }
    const userText = CONFIG.requirePrefix
      ? combinedText.replace(CONFIG.prefix, "").trim()
      : combinedText;

    // 6. Chuẩn bị media parts
    const { media, notes } = await prepareMediaParts(api, classified);
    if (signal?.aborted) return;

    // 7. Check YouTube
    const youtubeUrls = extractYouTubeUrls(combinedText);
    if (youtubeUrls.length > 0) {
      console.log(`[Bot] 🎬 Phát hiện ${youtubeUrls.length} YouTube video`);
      youtubeUrls.forEach((url) => media.push({ type: "youtube", url }));
    }

    // 8. Build prompt thống nhất
    const prompt = buildPrompt(
      classified,
      userText,
      quoteContent,
      youtubeUrls,
      notes
    );
    debugLog("MIXED", `Prompt: ${prompt.substring(0, 200)}...`);
    debugLog("MIXED", `Media parts: ${media.length}`);

    // 9. Check rate limit
    const waitTime = checkRateLimit(threadId);
    if (waitTime > 0) {
      const waitSec = Math.ceil(waitTime / 1000);
      console.log(`[Bot] ⏳ Rate limit: chờ ${waitSec}s`);
      await api.sendMessage(
        PROMPTS.rateLimit(waitSec),
        threadId,
        ThreadType.User
      );
      await new Promise((r) => setTimeout(r, waitTime));
      if (signal?.aborted) return;
    }
    markApiCall(threadId);

    // 10. Gọi Gemini và gửi response
    const mediaToSend = media.length > 0 ? media : undefined;

    if (CONFIG.useStreaming) {
      const callbacks = createStreamCallbacks(api, threadId, lastMsg, messages);
      callbacks.signal = signal;
      const result = await generateContentStream(
        prompt,
        callbacks,
        mediaToSend,
        threadId,
        history
      );
      if (result) await saveResponseToHistory(threadId, result);
      console.log(`[Bot] ✅ Đã trả lời (streaming)!`);
    } else {
      const aiReply = await generateContent(
        prompt,
        mediaToSend,
        threadId,
        history
      );
      if (signal?.aborted) return;
      await sendResponse(api, aiReply, threadId, lastMsg, messages);
      const responseText = aiReply.messages
        .map((m) => m.text)
        .filter(Boolean)
        .join(" ");
      await saveResponseToHistory(threadId, responseText);
      console.log(`[Bot] ✅ Đã trả lời!`);
    }
  } catch (e: any) {
    if (e.message === "Aborted" || signal?.aborted) {
      return debugLog("MIXED", "Aborted during processing");
    }
    logError("handleMixedContent", e);
    console.error("[Bot] Lỗi xử lý:", e);
  }
}

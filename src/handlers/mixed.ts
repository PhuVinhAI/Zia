import { ThreadType } from "../services/zalo.js";
import { generateWithMixedContent } from "../services/gemini.js";
import { sendResponse } from "./response.js";
import { saveToHistory, saveResponseToHistory } from "../utils/history.js";
import { logStep, logError, debugLog } from "../utils/logger.js";

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
  // Extracted data
  text?: string;
  url?: string;
  mimeType?: string;
  duration?: number;
  fileSize?: number;
  fileName?: string;
  stickerId?: string;
}

/**
 * Phân loại tin nhắn chi tiết
 */
export function classifyMessageDetailed(msg: any): ClassifiedMessage {
  const content = msg.data?.content;
  const msgType = msg.data?.msgType || "";

  // Text message
  if (typeof content === "string" && !msgType.includes("sticker")) {
    return { type: "text", message: msg, text: content };
  }

  // Sticker
  if (msgType === "chat.sticker" && content?.id) {
    return { type: "sticker", message: msg, stickerId: content.id };
  }

  // Image
  if (msgType === "chat.photo" || (msgType === "webchat" && content?.href)) {
    const url = content?.href || content?.hdUrl || content?.thumbUrl;
    return { type: "image", message: msg, url, mimeType: "image/jpeg" };
  }

  // Video
  if (msgType === "chat.video.msg" && content?.thumb) {
    const url = content?.href || content?.hdUrl;
    const params = content?.params ? JSON.parse(content.params) : {};
    const duration = params?.duration ? Math.round(params.duration / 1000) : 0;
    const fileSize = params?.fileSize ? parseInt(params.fileSize) : 0;
    return {
      type: "video",
      message: msg,
      url,
      mimeType: "video/mp4",
      duration,
      fileSize,
    };
  }

  // Voice
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

  // File
  if (msgType === "share.file" && content?.href) {
    const params = content?.params ? JSON.parse(content.params) : {};
    const fileExt = (params?.fileExt?.toLowerCase() || "").replace(".", "");
    const fileSize = params?.fileSize ? parseInt(params.fileSize) : 0;
    return {
      type: "file",
      message: msg,
      url: content.href,
      fileName: content.title || "file",
      fileSize,
      mimeType: getMimeType(fileExt),
    };
  }

  // Link preview
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
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    wav: "audio/wav",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Tạo prompt mô tả nội dung mixed
 */
function buildMixedPrompt(classified: ClassifiedMessage[]): string {
  const parts: string[] = [];

  for (const item of classified) {
    switch (item.type) {
      case "text":
        parts.push(`[Tin nhắn]: "${item.text}"`);
        break;
      case "sticker":
        parts.push(`[Sticker]: (xem hình sticker đính kèm)`);
        break;
      case "image":
        parts.push(`[Ảnh]: (xem hình ảnh đính kèm)`);
        break;
      case "video":
        parts.push(`[Video ${item.duration || 0}s]: (xem video đính kèm)`);
        break;
      case "voice":
        parts.push(
          `[Tin nhắn thoại ${item.duration || 0}s]: (nghe audio đính kèm)`
        );
        break;
      case "file":
        parts.push(`[File "${item.fileName}"]: (đọc file đính kèm)`);
        break;
      case "link":
        parts.push(`[Link]: ${item.url}`);
        break;
    }
  }

  const summary = parts.join("\n");
  return `Người dùng gửi ${classified.length} nội dung theo thứ tự:\n${summary}\n\nHãy XEM/NGHE tất cả nội dung đính kèm và phản hồi phù hợp. Nếu có câu hỏi trong tin nhắn text thì trả lời câu hỏi đó.`;
}

/**
 * Handler xử lý nhiều loại media cùng lúc
 * Gộp text + ảnh + video + voice + sticker + file thành 1 request
 */
export async function handleMixedContent(
  api: any,
  messages: any[],
  threadId: string,
  signal?: AbortSignal
) {
  // Phân loại tất cả tin nhắn
  const classified = messages.map(classifyMessageDetailed);

  // Đếm số lượng từng loại
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
    `[Bot] 📦 Gộp ${messages.length} tin nhắn: ` +
      Object.entries(counts)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")
  );

  logStep("handleMixedContent", { threadId, counts, total: messages.length });

  try {
    // Lưu tất cả vào history
    for (const msg of messages) {
      await saveToHistory(threadId, msg);
    }

    // Check abort
    if (signal?.aborted) {
      debugLog("MIXED", "Aborted before processing");
      return;
    }

    await api.sendTypingEvent(threadId, ThreadType.User);

    // Chuẩn bị media parts cho Gemini
    const mediaParts: Array<{
      type: "image" | "video" | "audio" | "file";
      url: string;
      mimeType: string;
    }> = [];

    // Lấy sticker URLs
    for (const item of classified) {
      if (item.type === "sticker" && item.stickerId) {
        try {
          const stickerDetails = await api.getStickersDetail(item.stickerId);
          const stickerInfo = stickerDetails?.[0];
          const stickerUrl =
            stickerInfo?.stickerUrl || stickerInfo?.stickerSpriteUrl;
          if (stickerUrl) {
            mediaParts.push({
              type: "image",
              url: stickerUrl,
              mimeType: "image/png",
            });
          }
        } catch (e) {
          debugLog("MIXED", `Failed to get sticker ${item.stickerId}`);
        }
      } else if (item.type === "image" && item.url) {
        mediaParts.push({
          type: "image",
          url: item.url,
          mimeType: item.mimeType || "image/jpeg",
        });
      } else if (item.type === "video" && item.url) {
        // Video dưới 20MB thì gửi, không thì bỏ qua
        if (item.fileSize && item.fileSize < 20 * 1024 * 1024) {
          mediaParts.push({
            type: "video",
            url: item.url,
            mimeType: "video/mp4",
          });
        }
      } else if (item.type === "voice" && item.url) {
        mediaParts.push({
          type: "audio",
          url: item.url,
          mimeType: item.mimeType || "audio/aac",
        });
      } else if (item.type === "file" && item.url) {
        mediaParts.push({
          type: "file",
          url: item.url,
          mimeType: item.mimeType || "application/octet-stream",
        });
      }
    }

    // Check abort again
    if (signal?.aborted) {
      debugLog("MIXED", "Aborted after preparing media");
      return;
    }

    // Build prompt
    const prompt = buildMixedPrompt(classified);
    debugLog("MIXED", `Prompt: ${prompt.substring(0, 200)}...`);
    debugLog("MIXED", `Media parts: ${mediaParts.length}`);

    // Gọi Gemini với mixed content
    const aiReply = await generateWithMixedContent(prompt, mediaParts);
    logStep("handleMixedContent:aiReply", aiReply);

    // Check abort before sending
    if (signal?.aborted) {
      debugLog("MIXED", "Aborted before sending response");
      return;
    }

    await sendResponse(api, aiReply, threadId, messages[messages.length - 1]);

    // Lưu response
    const responseText = aiReply.messages
      .map((m) => m.text)
      .filter(Boolean)
      .join(" ");
    await saveResponseToHistory(threadId, responseText);

    console.log(`[Bot] ✅ Đã trả lời ${messages.length} tin nhắn gộp!`);
  } catch (e: any) {
    if (e.message === "Aborted" || signal?.aborted) {
      debugLog("MIXED", "Aborted during processing");
      return;
    }
    logError("handleMixedContent", e);
    console.error("[Bot] Lỗi xử lý mixed content:", e);
  }
}

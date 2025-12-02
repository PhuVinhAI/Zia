import { ThreadType } from "../services/zalo.js";
import {
  generateContent,
  generateContentStream,
  extractYouTubeUrls,
  MediaPart,
} from "../services/gemini.js";
import { sendResponse, createStreamCallbacks } from "./response.js";
import { handleToolCalls, isToolOnlyResponse } from "./toolHandler.js";
import {
  saveToHistory,
  saveResponseToHistory,
  saveToolResultToHistory,
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
 * Parse quote attachment để lấy media URL
 */
interface QuoteMedia {
  type: "image" | "video" | "audio" | "file" | "sticker" | "none";
  url?: string;
  thumbUrl?: string;
  title?: string;
  mimeType?: string;
  stickerId?: string;
  duration?: number;
  fileExt?: string;
}

function parseQuoteAttachment(quote: any): QuoteMedia {
  // Check sticker từ cliMsgType (32 = photo, 5 = sticker, etc.)
  const cliMsgType = quote?.cliMsgType;

  // Sticker: cliMsgType = 5 hoặc có sticker pattern trong msg
  if (cliMsgType === 5 || (quote?.msg && /^\[\^[\d.]+\^\]$/.test(quote.msg))) {
    // Parse sticker ID từ msg pattern [^cateId.stickerId^]
    const match = quote.msg?.match(/\[\^(\d+)\.(\d+)\^\]/);
    if (match) {
      return { type: "sticker", stickerId: match[2] };
    }
  }

  if (!quote?.attach) return { type: "none" };

  try {
    const attach =
      typeof quote.attach === "string"
        ? JSON.parse(quote.attach)
        : quote.attach;

    const href = attach?.href || attach?.hdUrl;
    const thumb = attach?.thumb;
    const params = attach?.params
      ? typeof attach.params === "string"
        ? JSON.parse(attach.params)
        : attach.params
      : {};

    if (!href && !thumb) return { type: "none" };

    const url = href || thumb;

    // Check audio/voice
    if (
      url &&
      (url.includes("/voice/") ||
        url.includes("/audio/") ||
        /\.(aac|mp3|m4a|wav|ogg)$/i.test(url))
    ) {
      const duration = params?.duration
        ? Math.round(params.duration / 1000)
        : 0;
      return { type: "audio", url, mimeType: "audio/aac", duration };
    }

    // Check video
    if (
      url &&
      (url.includes("/video/") ||
        /\.(mp4|mov|avi|webm)$/i.test(url) ||
        params?.duration) // Video thường có duration
    ) {
      const duration = params?.duration
        ? Math.round(params.duration / 1000)
        : 0;
      return {
        type: "video",
        url,
        thumbUrl: thumb,
        mimeType: "video/mp4",
        duration,
      };
    }

    // Check file (có fileExt hoặc title với extension)
    const fileExt =
      params?.fileExt || attach?.title?.split(".").pop()?.toLowerCase();
    if (
      fileExt &&
      !["jpg", "jpeg", "png", "gif", "webp", "jxl"].includes(fileExt)
    ) {
      return {
        type: "file",
        url: href,
        title: attach?.title,
        fileExt,
        mimeType: CONFIG.mimeTypes[fileExt] || "application/octet-stream",
      };
    }

    // Check image (common image extensions or photo URLs)
    if (
      url &&
      (url.includes("/jpg/") ||
        url.includes("/png/") ||
        url.includes("/jxl/") ||
        url.includes("/webp/") ||
        url.includes("photo") ||
        /\.(jpg|jpeg|png|gif|webp|jxl)$/i.test(url))
    ) {
      return {
        type: "image",
        url,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: "image/jpeg",
      };
    }

    // Default to image if has href (most common case)
    if (href) {
      return {
        type: "image",
        url: href,
        thumbUrl: thumb,
        title: attach?.title,
        mimeType: "image/jpeg",
      };
    }

    return { type: "none" };
  } catch (e) {
    debugLog("QUOTE", `Failed to parse quote attach: ${e}`);
    return { type: "none" };
  }
}

/**
 * Build prompt thống nhất cho mọi loại tin nhắn
 */
function buildPrompt(
  classified: ClassifiedMessage[],
  userText: string,
  quoteContent: string | null,
  quoteHasMedia: boolean,
  quoteMediaType: string | undefined,
  youtubeUrls: string[],
  mediaNotes: string[]
): string {
  const hasMedia =
    classified.some((c) =>
      ["image", "video", "voice", "file", "sticker"].includes(c.type)
    ) || quoteHasMedia;

  let prompt: string;

  if (hasMedia && !quoteHasMedia) {
    // Có media từ tin nhắn mới → dùng mixedContent prompt
    const items = classified.map((c) => ({
      type: c.type,
      text: c.text,
      url: c.url,
      duration: c.duration,
      fileName: c.fileName,
    }));
    prompt = PROMPTS.mixedContent(items);
    prompt += PROMPTS.mediaNote(mediaNotes);
  } else if (quoteHasMedia) {
    // Quote có media → thêm context đặc biệt
    prompt = userText || "(người dùng không nhập text)";
    const quoteText =
      quoteContent && quoteContent !== "(nội dung không xác định)"
        ? quoteContent
        : undefined;
    prompt += PROMPTS.quoteMedia(quoteText, quoteMediaType);
  } else {
    // Text only → dùng userText trực tiếp
    prompt = userText;
  }

  // Thêm quote context (chỉ khi không có media trong quote)
  if (quoteContent && !quoteHasMedia) {
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

  // Đếm số lượng từng loại
  const counts = classified.reduce(
    (acc, c) => ({ ...acc, [c.type]: (acc[c.type] || 0) + 1 }),
    {} as Record<string, number>
  );

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
    const quote = lastMsg.data?.quote;

    // Parse quote content và media
    let quoteContent: string | null = null;
    let quoteMedia: QuoteMedia = { type: "none" };

    if (quote) {
      quoteContent = quote.msg || quote.content || null;
      quoteMedia = parseQuoteAttachment(quote);

      if (quoteMedia.type !== "none") {
        console.log(
          `[Bot] 💬 User reply tin có ${
            quoteMedia.type
          }: ${quoteMedia.url?.substring(0, 50)}...`
        );
      } else if (quoteContent) {
        console.log(`[Bot] 💬 User reply: "${quoteContent}"`);
      } else {
        quoteContent = "(nội dung không xác định)";
        console.log(`[Bot] 💬 User reply: "${quoteContent}"`);
      }
    }

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

    // 6.1. Thêm media từ quote nếu có
    if (quoteMedia.type === "image" && quoteMedia.url) {
      console.log(`[Bot] 📎 Đang fetch ảnh từ quote...`);
      media.push({
        type: "image",
        url: quoteMedia.url,
        mimeType: quoteMedia.mimeType || "image/jpeg",
      });
    } else if (quoteMedia.type === "video") {
      if (quoteMedia.url) {
        console.log(`[Bot] 📎 Đang fetch video từ quote...`);
        media.push({
          type: "video",
          url: quoteMedia.url,
          mimeType: "video/mp4",
        });
      } else if (quoteMedia.thumbUrl) {
        console.log(`[Bot] 📎 Đang fetch thumbnail video từ quote...`);
        media.push({
          type: "image",
          url: quoteMedia.thumbUrl,
          mimeType: "image/jpeg",
        });
        notes.push(
          `(Video ${quoteMedia.duration || 0}s từ tin cũ, chỉ có thumbnail)`
        );
      }
    } else if (quoteMedia.type === "audio" && quoteMedia.url) {
      console.log(`[Bot] 📎 Đang fetch audio từ quote...`);
      media.push({
        type: "audio",
        url: quoteMedia.url,
        mimeType: quoteMedia.mimeType || "audio/aac",
      });
    } else if (quoteMedia.type === "sticker" && quoteMedia.stickerId) {
      console.log(
        `[Bot] 📎 Đang fetch sticker từ quote: ${quoteMedia.stickerId}`
      );
      try {
        const details = await api.getStickersDetail(quoteMedia.stickerId);
        const stickerUrl =
          details?.[0]?.stickerUrl || details?.[0]?.stickerSpriteUrl;
        if (stickerUrl) {
          media.push({ type: "image", url: stickerUrl, mimeType: "image/png" });
        }
      } catch (e) {
        debugLog(
          "QUOTE",
          `Failed to get sticker ${quoteMedia.stickerId}: ${e}`
        );
        notes.push("(Không thể load sticker từ tin cũ)");
      }
    } else if (quoteMedia.type === "file" && quoteMedia.url) {
      console.log(
        `[Bot] 📎 Đang fetch file từ quote: ${
          quoteMedia.title || quoteMedia.fileExt
        }`
      );
      const ext = quoteMedia.fileExt || "";
      if (isGeminiSupported(ext)) {
        media.push({
          type: "file",
          url: quoteMedia.url,
          mimeType: quoteMedia.mimeType || "application/octet-stream",
        });
      } else if (isTextConvertible(ext)) {
        const base64 = await fetchAndConvertToTextBase64(quoteMedia.url);
        if (base64) {
          media.push({ type: "file", base64, mimeType: "text/plain" });
        } else {
          notes.push(`(File "${quoteMedia.title}" từ tin cũ không đọc được)`);
        }
      } else {
        notes.push(
          `(File "${quoteMedia.title}" định dạng .${ext} không hỗ trợ)`
        );
      }
    }

    // 7. Check YouTube
    const youtubeUrls = extractYouTubeUrls(combinedText);
    if (youtubeUrls.length > 0) {
      console.log(`[Bot] 🎬 Phát hiện ${youtubeUrls.length} YouTube video`);
      youtubeUrls.forEach((url) => media.push({ type: "youtube", url }));
    }

    // 8. Build prompt thống nhất
    const quoteHasMedia = quoteMedia.type !== "none";
    const quoteMediaType = quoteHasMedia ? quoteMedia.type : undefined;
    const prompt = buildPrompt(
      classified,
      userText,
      quoteContent,
      quoteHasMedia,
      quoteMediaType,
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

    // 10. Gọi Gemini và xử lý response (có thể có tool calls)
    const mediaToSend = media.length > 0 ? media : undefined;
    const senderId = lastMsg.data?.uidFrom || threadId;
    const senderName = lastMsg.data?.dName;

    // Helper function để xử lý AI response với tool support
    const processAIResponse = async (
      currentPrompt: string,
      currentMedia: typeof mediaToSend,
      currentHistory: typeof history,
      depth: number = 0
    ): Promise<void> => {
      // Giới hạn độ sâu đệ quy để tránh loop vô hạn
      const MAX_TOOL_DEPTH = CONFIG.maxToolDepth || 10;
      if (depth >= MAX_TOOL_DEPTH) {
        console.log(`[Bot] ⚠️ Đạt giới hạn tool depth (${MAX_TOOL_DEPTH})`);
        return;
      }

      if (CONFIG.useStreaming) {
        // STREAMING MODE - Cần xử lý tool sau khi stream xong
        // Tạo callbacks với tool-aware logic
        const callbacks = createStreamCallbacks(
          api,
          threadId,
          lastMsg,
          messages,
          true // enableToolDetection - tạm dừng gửi tin nếu phát hiện tool
        );
        callbacks.signal = signal;

        const result = await generateContentStream(
          currentPrompt,
          callbacks,
          currentMedia,
          threadId,
          currentHistory
        );

        if (signal?.aborted) {
          debugLog(
            "MIXED",
            `Aborted with ${result ? "partial" : "no"} response`
          );
          if (result) await saveResponseToHistory(threadId, result);
          return;
        }

        if (!result) return;

        // Check for tool calls in streamed response
        const toolResult = await handleToolCalls(
          result,
          api,
          threadId,
          senderId,
          senderName
        );

        if (toolResult.hasTools) {
          debugLog(
            "MIXED",
            `Tool detected: ${toolResult.toolCalls
              .map((t) => t.toolName)
              .join(", ")}`
          );

          // Lưu AI response (có tool call) vào history
          await saveResponseToHistory(threadId, result);

          // Lưu tool result vào history
          await saveToolResultToHistory(threadId, toolResult.promptForAI);

          // Gọi lại AI với tool result (không có media)
          const updatedHistory = getHistory(threadId);
          await processAIResponse(
            toolResult.promptForAI,
            undefined, // Không cần media cho tool result
            updatedHistory,
            depth + 1
          );
        } else {
          // Không có tool call, lưu response bình thường
          await saveResponseToHistory(threadId, result);
          console.log(`[Bot] ✅ Đã trả lời (streaming)!`);
        }
      } else {
        // NON-STREAMING MODE
        const aiReply = await generateContent(
          currentPrompt,
          currentMedia,
          threadId,
          currentHistory
        );

        if (signal?.aborted) return;

        const responseText = aiReply.messages
          .map((m) => m.text)
          .filter(Boolean)
          .join(" ");

        // Check for tool calls
        const toolResult = await handleToolCalls(
          responseText,
          api,
          threadId,
          senderId,
          senderName
        );

        if (toolResult.hasTools) {
          // Nếu response CHỈ có tool call (không có text khác), không gửi response
          if (!isToolOnlyResponse(responseText)) {
            // Có text khác ngoài tool call, gửi phần text đó
            await sendResponse(
              api,
              {
                ...aiReply,
                messages: aiReply.messages.map((m) => ({
                  ...m,
                  text: m.text ? toolResult.cleanedResponse : m.text,
                })),
              },
              threadId,
              lastMsg,
              messages
            );
          }

          // Lưu AI response (có tool call) vào history
          await saveResponseToHistory(threadId, responseText);

          // Lưu tool result vào history
          await saveToolResultToHistory(threadId, toolResult.promptForAI);

          // Gọi lại AI với tool result
          const updatedHistory = getHistory(threadId);
          await processAIResponse(
            toolResult.promptForAI,
            undefined,
            updatedHistory,
            depth + 1
          );
        } else {
          // Không có tool call, xử lý bình thường
          await sendResponse(api, aiReply, threadId, lastMsg, messages);
          await saveResponseToHistory(threadId, responseText);
          console.log(`[Bot] ✅ Đã trả lời!`);
        }
      }
    };

    // Bắt đầu xử lý
    await processAIResponse(prompt, mediaToSend, history);
  } catch (e: any) {
    if (e.message === "Aborted" || signal?.aborted) {
      return debugLog("MIXED", "Aborted during processing");
    }
    logError("handleMixedContent", e);
    console.error("[Bot] Lỗi xử lý:", e);
  }
}

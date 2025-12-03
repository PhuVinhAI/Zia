/**
 * Message Classifier - Phân loại tin nhắn Zalo
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
export function classifyMessage(msg: any): ClassifiedMessage {
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

  // Image/Photo
  if (msgType === "chat.photo" || (msgType === "webchat" && content?.href)) {
    const url = content?.href || content?.hdUrl || content?.thumbUrl;
    return { type: "image", message: msg, url, mimeType: "image/jpeg" };
  }

  // Video
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

  // Voice message
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
      fileExt,
      fileSize,
      mimeType: "application/octet-stream",
    };
  }

  // Link
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
 * Phân loại nhiều tin nhắn
 */
export function classifyMessages(messages: any[]): ClassifiedMessage[] {
  return messages.map(classifyMessage);
}

/**
 * Đếm số lượng từng loại tin nhắn
 */
export function countMessageTypes(
  classified: ClassifiedMessage[]
): Record<string, number> {
  return classified.reduce(
    (acc, c) => ({ ...acc, [c.type]: (acc[c.type] || 0) + 1 }),
    {} as Record<string, number>
  );
}

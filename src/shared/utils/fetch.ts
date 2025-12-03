import { debugLog, logError } from "../../core/logger/logger.js";

export async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    debugLog("FETCH", `Fetching: ${url.substring(0, 80)}...`);
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    debugLog("FETCH", `Success: ${base64.length} chars base64`);
    return base64;
  } catch (e: any) {
    logError("fetchAsBase64", e);
    console.error("Lỗi tải file:", e);
    return null;
  }
}

export async function fetchAsText(url: string): Promise<string | null> {
  try {
    debugLog("FETCH", `Fetching text: ${url.substring(0, 80)}...`);
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    // Thử decode với UTF-8, nếu lỗi thì dùng latin1
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      debugLog("FETCH", `Text success: ${text.length} chars (UTF-8)`);
      return text;
    } catch {
      const text = new TextDecoder("latin1").decode(buffer);
      debugLog("FETCH", `Text success: ${text.length} chars (latin1)`);
      return text;
    }
  } catch (e: any) {
    logError("fetchAsText", e);
    console.error("Lỗi tải file text:", e);
    return null;
  }
}

/**
 * Tải file, convert sang text, rồi trả về base64 của text đó
 * (Như convert file sang .txt rồi encode base64)
 */
export async function fetchAndConvertToTextBase64(
  url: string
): Promise<string | null> {
  try {
    debugLog("FETCH", `Converting to text base64: ${url.substring(0, 80)}...`);
    const textContent = await fetchAsText(url);
    if (!textContent) {
      debugLog("FETCH", "Text conversion failed: no content");
      return null;
    }
    // Convert text content thành base64 (như file .txt)
    const base64 = Buffer.from(textContent, "utf-8").toString("base64");
    debugLog("FETCH", `Text to base64 success: ${base64.length} chars`);
    return base64;
  } catch (e: any) {
    logError("fetchAndConvertToTextBase64", e);
    console.error("Lỗi convert file sang text:", e);
    return null;
  }
}

// Các định dạng Gemini hỗ trợ native
const GEMINI_SUPPORTED_FORMATS = new Set([
  // Documents
  "pdf",
  "txt",
  "html",
  "css",
  "js",
  "ts",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rb",
  "php",
  "swift",
  "kt",
  "rs",
  "md",
  "json",
  "xml",
  "yaml",
  "yml",
  // Images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "heif",
  // Audio
  "wav",
  "mp3",
  "aiff",
  "aac",
  "ogg",
  "flac",
  // Video
  "mp4",
  "mpeg",
  "mov",
  "avi",
  "flv",
  "mpg",
  "webm",
  "wmv",
  "3gp",
]);

// Các định dạng có thể convert sang text
const TEXT_CONVERTIBLE_FORMATS = new Set([
  "doc",
  "docx",
  "rtf",
  "odt",
  "csv",
  "tsv",
  "log",
  "ini",
  "cfg",
  "conf",
  "sql",
  "sh",
  "bat",
  "ps1",
  "jsx",
  "tsx",
  "vue",
  "svelte",
  "scss",
  "sass",
  "less",
  "env",
  "gitignore",
  "dockerfile",
]);

/** Kiểm tra file có được Gemini hỗ trợ native không */
export const isGeminiSupported = (ext: string) =>
  GEMINI_SUPPORTED_FORMATS.has(ext.toLowerCase());

/** Kiểm tra file có thể convert sang text không */
export const isTextConvertible = (ext: string) =>
  TEXT_CONVERTIBLE_FORMATS.has(ext.toLowerCase());

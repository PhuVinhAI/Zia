import { debugLog, logError } from "./logger.js";

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
    const textContent = await fetchAsText(url);
    if (!textContent) return null;
    // Convert text content thành base64 (như file .txt)
    return Buffer.from(textContent, "utf-8").toString("base64");
  } catch (e) {
    console.error("Lỗi convert file sang text:", e);
    return null;
  }
}

// Các định dạng Gemini hỗ trợ native
export const GEMINI_SUPPORTED_FORMATS = [
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
];

// Các định dạng có thể convert sang text
export const TEXT_CONVERTIBLE_FORMATS = [
  "doc",
  "docx",
  "rtf",
  "odt", // Word documents (chỉ extract text cơ bản)
  "csv",
  "tsv", // Spreadsheet text
  "log",
  "ini",
  "cfg",
  "conf", // Config files
  "sql",
  "sh",
  "bat",
  "ps1", // Scripts
  "jsx",
  "tsx",
  "vue",
  "svelte", // Frontend
  "scss",
  "sass",
  "less", // CSS preprocessors
  "env",
  "gitignore",
  "dockerfile", // Dev files
];

/**
 * Kiểm tra file có được Gemini hỗ trợ native không
 */
export function isGeminiSupported(ext: string): boolean {
  return GEMINI_SUPPORTED_FORMATS.includes(ext.toLowerCase());
}

/**
 * Kiểm tra file có thể convert sang text không
 */
export function isTextConvertible(ext: string): boolean {
  return TEXT_CONVERTIBLE_FORMATS.includes(ext.toLowerCase());
}

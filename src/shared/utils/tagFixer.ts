/**
 * Tag Fixer - Fix tag bị dính vào text
 *
 * Ví dụ:
 * - "[reaction:heart]text" → "[reaction:heart] text"
 * - "text[sticker:love]more" → "text [sticker:love] more"
 * - "[quote:0]nội dung[/quote]tiếp" → "[quote:0]nội dung [/quote] tiếp"
 */

/**
 * Fix tag bị dính vào text
 * Thêm khoảng trắng trước/sau tag [] nếu bị dính vào chữ/số
 */
export function fixStuckTags(text: string): string {
  // Thêm space sau tag đóng ] nếu bị dính vào chữ/số (không phải [ hoặc space)
  let result = text.replace(/\]([^\s\[\]])/g, '] $1');
  // Thêm space trước tag mở [ nếu bị dính vào chữ/số (không phải ] hoặc space)
  result = result.replace(/([^\s\[\]])\[/g, '$1 [');
  return result;
}

import { TextStyle } from "../../infrastructure/zalo/zalo.service.js";
import { debugLog } from "../../core/logger/logger.js";

interface StyleItem {
  start: number;
  len: number;
  st: any;
}

interface ParsedRichText {
  msg: string;
  styles: StyleItem[];
}

/**
 * Parse text với cú pháp đơn giản thành Zalo rich text styles
 * Cú pháp hỗ trợ:
 * - *text*   -> Bold (in đậm)
 * - _text_   -> Italic (in nghiêng)
 * - __text__ -> Underline (gạch chân)
 * - ~text~   -> StrikeThrough (gạch ngang)
 * - !text!   -> Red (chữ đỏ - cảnh báo)
 * - !!text!! -> Blue (chữ xanh)
 * - ##text## -> Big (tiêu đề lớn)
 * - ^^text^^ -> Small (chữ nhỏ)
 */
export function parseRichText(rawText: string): ParsedRichText {
  let msg = rawText;
  const styles: StyleItem[] = [];

  // Định nghĩa các pattern và style tương ứng
  // Thứ tự quan trọng: pattern dài hơn phải xử lý trước (__ trước _, !! trước !)
  const patterns: Array<{ regex: RegExp; style: any }> = [
    { regex: /__([^_]+)__/g, style: TextStyle.Underline },
    { regex: /!!([^!]+)!!/g, style: TextStyle.Blue },
    { regex: /##([^#]+)##/g, style: TextStyle.Big },
    { regex: /\^\^([^\^]+)\^\^/g, style: TextStyle.Small },
    { regex: /\*([^*]+)\*/g, style: TextStyle.Bold },
    { regex: /_([^_]+)_/g, style: TextStyle.Italic },
    { regex: /~([^~]+)~/g, style: TextStyle.StrikeThrough },
    { regex: /!([^!]+)!/g, style: TextStyle.Red },
  ];

  // Xử lý từng pattern
  for (const { regex, style } of patterns) {
    let match;
    // Reset regex
    regex.lastIndex = 0;

    while ((match = regex.exec(msg)) !== null) {
      const fullMatch = match[0];
      const content = match[1];
      const startIndex = match.index;

      // Xóa ký tự đánh dấu, giữ lại nội dung
      msg =
        msg.slice(0, startIndex) +
        content +
        msg.slice(startIndex + fullMatch.length);

      // Thêm style
      styles.push({
        start: startIndex,
        len: content.length,
        st: style,
      });

      // Reset regex để tìm tiếp từ đầu (vì string đã thay đổi)
      regex.lastIndex = 0;
    }
  }

  return { msg, styles };
}

/**
 * Tạo object message cho Zalo API với rich text
 */
export function createRichMessage(
  text: string,
  quote?: any
): { msg: string; styles?: StyleItem[]; quote?: any } {
  const { msg, styles } = parseRichText(text);

  const result: any = { msg };

  if (styles.length > 0) {
    result.styles = styles;
    debugLog("RICH_TEXT", `Parsed ${styles.length} styles from text`);
  }

  if (quote) {
    result.quote = quote;
    debugLog("RICH_TEXT", `Added quote: msgId=${quote.msgId}`);
  }

  return result;
}

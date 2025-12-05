/**
 * Message Chunker
 * Tự động chia nhỏ tin nhắn dài thành các phần nhỏ hơn
 * để tránh lỗi "Nội dung quá dài" từ Zalo API
 */

// Giới hạn ký tự của Zalo (để an toàn, dùng 1800 thay vì 2000)
const MAX_MESSAGE_LENGTH = 1800;

/**
 * Chia nhỏ tin nhắn dài thành các phần nhỏ hơn
 * Ưu tiên cắt theo: đoạn văn > câu > từ
 */
export function splitMessage(text: string, maxLength: number = MAX_MESSAGE_LENGTH): string[] {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining.trim());
      break;
    }

    // Tìm điểm cắt tốt nhất trong phạm vi maxLength
    let cutPoint = findBestCutPoint(remaining, maxLength);

    // Nếu không tìm được điểm cắt tốt, cắt cứng tại maxLength
    if (cutPoint <= 0) {
      cutPoint = maxLength;
    }

    const chunk = remaining.slice(0, cutPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    remaining = remaining.slice(cutPoint).trim();
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Tìm điểm cắt tốt nhất (ưu tiên theo thứ tự)
 */
function findBestCutPoint(text: string, maxLength: number): number {
  const searchRange = text.slice(0, maxLength);

  // 1. Ưu tiên cắt theo đoạn văn (double newline)
  const paragraphBreak = searchRange.lastIndexOf('\n\n');
  if (paragraphBreak > maxLength * 0.3) {
    return paragraphBreak + 2;
  }

  // 2. Cắt theo newline đơn
  const lineBreak = searchRange.lastIndexOf('\n');
  if (lineBreak > maxLength * 0.3) {
    return lineBreak + 1;
  }

  // 3. Cắt theo câu (. ! ?)
  const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  let bestSentenceEnd = -1;
  for (const ender of sentenceEnders) {
    const pos = searchRange.lastIndexOf(ender);
    if (pos > bestSentenceEnd) {
      bestSentenceEnd = pos;
    }
  }
  if (bestSentenceEnd > maxLength * 0.3) {
    return bestSentenceEnd + 2;
  }

  // 4. Cắt theo dấu phẩy hoặc chấm phẩy
  const commaBreak = Math.max(
    searchRange.lastIndexOf(', '),
    searchRange.lastIndexOf('; '),
    searchRange.lastIndexOf(': ')
  );
  if (commaBreak > maxLength * 0.5) {
    return commaBreak + 2;
  }

  // 5. Cắt theo khoảng trắng
  const spaceBreak = searchRange.lastIndexOf(' ');
  if (spaceBreak > maxLength * 0.5) {
    return spaceBreak + 1;
  }

  // 6. Không tìm được điểm cắt tốt
  return -1;
}

/**
 * Kiểm tra xem tin nhắn có cần chia nhỏ không
 */
export function needsChunking(text: string, maxLength: number = MAX_MESSAGE_LENGTH): boolean {
  return text.length > maxLength;
}

/**
 * Lấy giới hạn ký tự mặc định
 */
export function getMaxMessageLength(): number {
  return MAX_MESSAGE_LENGTH;
}

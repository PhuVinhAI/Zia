/**
 * Message Chunker
 * Tự động chia nhỏ tin nhắn dài thành các phần nhỏ hơn
 * để tránh lỗi "Nội dung quá dài" từ Zalo API
 *
 * ĐẶC BIỆT: Bảo toàn code blocks, mermaid diagrams, tables
 * để tránh bị hiển thị raw markdown khi chia tin nhắn
 */

// Giới hạn ký tự của Zalo (để an toàn, dùng 1800 thay vì 2000)
const MAX_MESSAGE_LENGTH = 1800;

// ═══════════════════════════════════════════════════
// MARKDOWN BLOCK DETECTION
// ═══════════════════════════════════════════════════

interface MarkdownBlock {
  type: 'code' | 'table';
  start: number;
  end: number;
  content: string;
}

/**
 * Tìm tất cả code blocks (```...```) trong text
 */
function findCodeBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const regex = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      type: 'code',
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  return blocks;
}

/**
 * Tìm tất cả tables trong text
 * Table format: |...|
 *               |---|
 *               |...|
 */
function findTables(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const regex = /(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      type: 'table',
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  return blocks;
}

/**
 * Tìm tất cả markdown blocks (code + table)
 */
function findAllMarkdownBlocks(text: string): MarkdownBlock[] {
  const codeBlocks = findCodeBlocks(text);
  const tables = findTables(text);
  return [...codeBlocks, ...tables].sort((a, b) => a.start - b.start);
}

/**
 * Kiểm tra xem vị trí có nằm trong một markdown block không
 */
function isInsideBlock(position: number, blocks: MarkdownBlock[]): MarkdownBlock | null {
  for (const block of blocks) {
    if (position > block.start && position < block.end) {
      return block;
    }
  }
  return null;
}

/**
 * Tìm các placeholder (📄 [Code: ...], 📊 [Bảng ...], 📊 [Sơ đồ ...])
 */
function findPlaceholders(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  // Match: 📄 [Code: ...] hoặc 📊 [Bảng ...] hoặc 📊 [Sơ đồ ...]
  const regex = /[📄📊]\s*\[[^\]]+\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      type: 'code', // type không quan trọng, chỉ cần start/end
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  return blocks;
}

/**
 * Tìm điểm cắt an toàn (không cắt giữa markdown block hoặc placeholder)
 */
function findSafeCutPoint(text: string, preferredCut: number, blocks: MarkdownBlock[]): number {
  // Thêm placeholders vào danh sách blocks cần bảo vệ
  const placeholders = findPlaceholders(text);
  const allBlocks = [...blocks, ...placeholders].sort((a, b) => a.start - b.start);

  const insideBlock = isInsideBlock(preferredCut, allBlocks);

  if (!insideBlock) {
    // Không nằm trong block, có thể cắt tại đây
    return preferredCut;
  }

  // Đang nằm trong block, cần tìm điểm cắt khác
  // Ưu tiên 1: Cắt trước block (nếu block không quá gần đầu)
  if (insideBlock.start > MAX_MESSAGE_LENGTH * 0.2) {
    return insideBlock.start;
  }

  // Ưu tiên 2: Cắt sau block (nếu block không quá dài)
  if (insideBlock.end <= MAX_MESSAGE_LENGTH * 1.5) {
    return insideBlock.end;
  }

  // Block quá dài, phải cắt trong block (sẽ xử lý riêng)
  return -1;
}

// ═══════════════════════════════════════════════════
// MAIN CHUNKER
// ═══════════════════════════════════════════════════

/**
 * Chia nhỏ tin nhắn dài thành các phần nhỏ hơn
 * Ưu tiên cắt theo: đoạn văn > câu > từ
 * ĐẶC BIỆT: Không cắt giữa code blocks, tables, mermaid diagrams
 */
export function splitMessage(text: string, maxLength: number = MAX_MESSAGE_LENGTH): string[] {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  const blocks = findAllMarkdownBlocks(text);
  const chunks: string[] = [];
  let remaining = text;
  let offset = 0; // Track offset khi cắt text

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

    // Điều chỉnh blocks offset cho phần text còn lại
    const adjustedBlocks = blocks
      .filter(b => b.start >= offset && b.end > offset)
      .map(b => ({
        ...b,
        start: b.start - offset,
        end: b.end - offset,
      }));

    // Kiểm tra và điều chỉnh điểm cắt để không cắt giữa markdown block
    const safeCutPoint = findSafeCutPoint(remaining, cutPoint, adjustedBlocks);

    if (safeCutPoint === -1) {
      // Block quá dài, cắt cứng nhưng đánh dấu để xử lý sau
      // (parseMarkdownToZalo sẽ xử lý incomplete blocks)
      cutPoint = maxLength;
    } else {
      cutPoint = safeCutPoint;
    }

    // Đảm bảo cutPoint hợp lệ
    if (cutPoint <= 0) {
      cutPoint = maxLength;
    }

    const chunk = remaining.slice(0, cutPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    offset += cutPoint;
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

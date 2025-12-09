// TypeScript interface
// ReactionType có thể là "heart" hoặc "0:heart" (với index)
export type ReactionType = string;

export interface AIMessage {
  text: string;
  sticker: string;
  quoteIndex: number;
  card?: string; // userId để gửi danh thiếp (rỗng = gửi card của bot)
}

export interface AIResponse {
  reactions: ReactionType[]; // Nhiều reaction
  messages: AIMessage[];
  undoIndexes: number[]; // Index tin nhắn cần thu hồi (-1 = tin mới nhất)
}

// Default response khi parse lỗi
export const DEFAULT_RESPONSE: AIResponse = {
  reactions: ['like'],
  messages: [{ text: 'Xin lỗi, mình gặp lỗi rồi!', sticker: '', quoteIndex: -1 }],
  undoIndexes: [],
};

const VALID_REACTIONS = new Set(['heart', 'haha', 'wow', 'sad', 'angry', 'like']);

import { debugLog } from '../../core/logger/logger.js';
import { fixStuckTags } from '../utils/tagFixer.js';

// Parse AI response từ text với tag []
export function parseAIResponse(text: string): AIResponse {
  debugLog('PARSE', `Input text length: ${text.length}`);
  
  // Fix stuck tags trước khi parse
  const fixedText = fixStuckTags(text);

  try {
    const result: AIResponse = {
      reactions: [],
      messages: [],
      undoIndexes: [],
    };

    // Parse [reaction:xxx] hoặc [reaction:INDEX:xxx] - hỗ trợ nhiều reaction
    // Format 1: [reaction:heart] - thả vào tin cuối
    // Format 2: [reaction:0:heart] - thả vào tin index 0 trong batch
    const reactionMatches = fixedText.matchAll(/\[reaction:(\d+:)?(\w+)\]/gi);
    for (const match of reactionMatches) {
      const indexPart = match[1]; // "0:" hoặc undefined
      const reactionType = match[2].toLowerCase();

      if (VALID_REACTIONS.has(reactionType) && reactionType !== 'none') {
        if (indexPart) {
          // Có index: "0:heart" -> lưu dạng "0:heart"
          const index = indexPart.replace(':', '');
          result.reactions.push(`${index}:${reactionType}` as ReactionType);
        } else {
          // Không có index: "heart" -> lưu bình thường
          result.reactions.push(reactionType as ReactionType);
        }
      }
    }

    // Parse [sticker:xxx] - hỗ trợ nhiều sticker
    const stickerMatches = fixedText.matchAll(/\[sticker:(\w+)\]/gi);
    for (const match of stickerMatches) {
      result.messages.push({
        text: '',
        sticker: match[1],
        quoteIndex: -1,
      });
    }

    // Parse [quote:index]nội dung[/quote] - bao gồm cả text ngay sau [/quote]
    // AI hay viết: [quote:0]Tin gốc[/quote] Câu trả lời → cần gộp "Câu trả lời" vào quote
    const quoteRegex = /\[quote:(-?\d+)\]([\s\S]*?)\[\/quote\]\s*([^\[]*?)(?=\[|$)/gi;
    let quoteMatch;
    while ((quoteMatch = quoteRegex.exec(fixedText)) !== null) {
      const quoteIndex = parseInt(quoteMatch[1], 10);
      const insideQuote = quoteMatch[2].trim();
      const afterQuote = quoteMatch[3].trim();

      // Gộp nội dung trong quote và sau quote
      const fullText = afterQuote ? `${insideQuote} ${afterQuote}`.trim() : insideQuote;

      if (fullText) {
        result.messages.push({
          text: fullText,
          sticker: '',
          quoteIndex,
        });
      }
    }

    // Parse [msg]nội dung[/msg] - nhiều tin nhắn riêng biệt
    const msgMatches = fixedText.matchAll(/\[msg\]([\s\S]*?)\[\/msg\]/gi);
    for (const match of msgMatches) {
      result.messages.push({
        text: match[1].trim(),
        sticker: '',
        quoteIndex: -1,
      });
    }

    // Parse [undo:index] - thu hồi tin nhắn đã gửi (-1 = tin mới nhất)
    const undoMatches = fixedText.matchAll(/\[undo:(-?\d+)\]/gi);
    for (const match of undoMatches) {
      result.undoIndexes.push(parseInt(match[1], 10));
    }

    // Parse [card:userId] hoặc [card] - gửi danh thiếp
    const cardMatches = fixedText.matchAll(/\[card(?::(\d+))?\]/gi);
    for (const match of cardMatches) {
      result.messages.push({
        text: '',
        sticker: '',
        quoteIndex: -1,
        card: match[1] || '', // rỗng = gửi card của bot
      });
    }

    // Lấy text thuần (loại bỏ các tag và text ngay sau [/quote])
    const plainText = fixedText
      .replace(/\[reaction:(\d+:)?\w+\]/gi, '') // Hỗ trợ cả [reaction:heart] và [reaction:0:heart]
      .replace(/\[sticker:\w+\]/gi, '')
      .replace(/\[quote:-?\d+\][\s\S]*?\[\/quote\]\s*[^\[]*?(?=\[|$)/gi, '') // Bao gồm text sau [/quote]
      .replace(/\[msg\][\s\S]*?\[\/msg\]/gi, '')
      .replace(/\[undo:-?\d+\]/gi, '')
      .replace(/\[card(?::\d+)?\]/gi, '')
      .trim();

    // Nếu có text thuần, thêm vào messages đầu tiên
    if (plainText) {
      result.messages.unshift({
        text: plainText,
        sticker: '',
        quoteIndex: -1,
      });
    }

    // Nếu không có gì, trả về default
    if (result.messages.length === 0 && result.reactions.length === 0) {
      debugLog('PARSE', 'Empty result, returning default');
      return DEFAULT_RESPONSE;
    }

    debugLog(
      'PARSE',
      `Parsed: ${result.reactions.length} reactions, ${result.messages.length} messages, ${result.undoIndexes.length} undos`,
    );
    return result;
  } catch (e) {
    console.error('[Parser] Error:', e, 'Text:', text);
    debugLog('PARSE', `Error parsing: ${e}`);
    return DEFAULT_RESPONSE;
  }
}

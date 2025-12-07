/**
 * Zalo Types - Định nghĩa types cho Zalo API
 * Tách ra shared để tránh circular dependency
 */

// TextStyle enum cho rich text formatting
// Phải match với zca-js TextStyle enum (string values)
export const TextStyle = {
  Bold: 'b',
  Italic: 'i',
  Underline: 'u',
  StrikeThrough: 's',
  Red: 'c_db342e',
  Orange: 'c_f27806',
  Yellow: 'c_f7b503',
  Green: 'c_15a85f',
  Blue: 'c_0068ff', // Zalo blue color
  Small: 'f_13',
  Big: 'f_18',
  UnorderedList: 'lst_1',
  OrderedList: 'lst_2',
} as const;

export type TextStyleType = (typeof TextStyle)[keyof typeof TextStyle];

// ═══════════════════════════════════════════════════
// ZALO MESSAGE TYPES
// ═══════════════════════════════════════════════════

/**
 * Zalo Message Attachment
 */
export interface ZaloAttachment {
  filename?: string;
  data?: Buffer;
  metadata?: {
    totalSize?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Zalo Message Data
 */
export interface ZaloMessageData {
  uidFrom?: string;
  dName?: string;
  content?: string;
  msgId?: string;
  cliMsgId?: string;
  msgType?: string;
  quote?: ZaloQuote;
  // Media fields
  href?: string;
  thumbUrl?: string;
  duration?: number;
  fileSize?: number;
  fileExt?: string;
  fileName?: string;
  // Sticker
  stickerId?: string;
  stickerType?: number;
  // Forward
  params?: {
    oriMsgId?: string;
    oriMsgType?: string;
    oriContent?: string;
  };
}

/**
 * Zalo Quote (reply message)
 */
export interface ZaloQuote {
  ownerId?: string;
  globalMsgId?: string;
  cliMsgId?: string;
  msgType?: string;
  ts?: string;
  msg?: string;
  attach?: string;
  // Parsed attach
  href?: string;
  thumbUrl?: string;
  duration?: number;
  fileSize?: number;
  fileExt?: string;
  title?: string;
  stickerId?: string;
}

/**
 * Zalo Message Event
 */
export interface ZaloMessage {
  threadId: string;
  type: ZaloMessageType;
  data: ZaloMessageData;
  isSelf?: boolean;
}

/**
 * Zalo Message Types
 */
export type ZaloMessageType =
  | 'message'
  | 'webchat'
  | 'sticker'
  | 'image'
  | 'video'
  | 'voice'
  | 'file'
  | 'gif'
  | 'doodle'
  | 'forward'
  | 'undo'
  | 'reaction';

/**
 * Thread Type enum
 */
export const ZaloThreadType = {
  User: 0,
  Group: 1,
} as const;

export type ZaloThreadTypeValue = (typeof ZaloThreadType)[keyof typeof ZaloThreadType];

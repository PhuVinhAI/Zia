/**
 * Zalo Types - Định nghĩa types cho Zalo API
 * Tách ra shared để tránh circular dependency
 */

// TextStyle enum cho rich text formatting
export const TextStyle = {
  Bold: 1,
  Italic: 2,
  Underline: 4,
  StrikeThrough: 8,
  Red: 16,
  Blue: 32,
  Big: 64,
  Small: 128,
} as const;

export type TextStyleType = (typeof TextStyle)[keyof typeof TextStyle];

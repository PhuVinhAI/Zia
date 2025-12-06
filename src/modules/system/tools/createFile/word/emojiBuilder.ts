/**
 * Emoji Builder - Hỗ trợ emoji và icons trong Word
 */

import { Paragraph, TextRun } from 'docx';
import { getTheme } from './themes.js';
import type { DocumentTheme } from './types.js';

// ═══════════════════════════════════════════════════
// EMOJI MAPPINGS
// ═══════════════════════════════════════════════════

const EMOJI_SHORTCUTS: Record<string, string> = {
  // Faces
  ':)': '😊',
  ':D': '😃',
  ':(': '😢',
  ':P': '😛',
  ';)': '😉',
  ':O': '😮',
  '<3': '❤️',
  '</3': '💔',

  // Common
  ':check:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':info:': 'ℹ️',
  ':star:': '⭐',
  ':fire:': '🔥',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':clap:': '👏',
  ':rocket:': '🚀',
  ':bulb:': '💡',
  ':question:': '❓',
  ':exclamation:': '❗',

  // Arrows
  ':arrow_right:': '→',
  ':arrow_left:': '←',
  ':arrow_up:': '↑',
  ':arrow_down:': '↓',
  ':arrow_double:': '↔',

  // Symbols
  ':copyright:': '©',
  ':registered:': '®',
  ':trademark:': '™',
  ':degree:': '°',
  ':infinity:': '∞',
  ':checkmark:': '✓',
  ':crossmark:': '✗',

  // Numbers in circles
  ':1:': '①',
  ':2:': '②',
  ':3:': '③',
  ':4:': '④',
  ':5:': '⑤',
  ':6:': '⑥',
  ':7:': '⑦',
  ':8:': '⑧',
  ':9:': '⑨',
  ':10:': '⑩',

  // Letters in circles
  ':a:': 'Ⓐ',
  ':b:': 'Ⓑ',
  ':c:': 'Ⓒ',
  ':d:': 'Ⓓ',
  ':e:': 'Ⓔ',

  // Decorative
  ':diamond:': '◆',
  ':circle:': '●',
  ':square:': '■',
  ':triangle:': '▲',
  ':heart:': '♥',
  ':spade:': '♠',
  ':club:': '♣',
  ':diamond_suit:': '♦',

  // Status
  ':new:': '🆕',
  ':hot:': '🔥',
  ':cool:': '😎',
  ':ok:': '🆗',
  ':sos:': '🆘',
  ':free:': '🆓',

  // Weather
  ':sun:': '☀️',
  ':cloud:': '☁️',
  ':rain:': '🌧️',
  ':snow:': '❄️',
  ':thunder:': '⚡',

  // Objects
  ':phone:': '📱',
  ':email:': '📧',
  ':calendar:': '📅',
  ':clock:': '🕐',
  ':pin:': '📍',
  ':link:': '🔗',
  ':key:': '🔑',
  ':lock:': '🔒',
  ':unlock:': '🔓',
  ':book:': '📖',
  ':folder:': '📁',
  ':file:': '📄',
  ':pencil:': '✏️',
  ':scissors:': '✂️',
  ':paperclip:': '📎',
  ':pushpin:': '📌',
  ':magnifier:': '🔍',
  ':bell:': '🔔',
  ':speaker:': '🔊',
  ':mute:': '🔇',
};

// ═══════════════════════════════════════════════════
// EMOJI FUNCTIONS
// ═══════════════════════════════════════════════════

/**
 * Replace emoji shortcuts với actual emojis
 */
export function replaceEmojiShortcuts(text: string): string {
  let result = text;

  for (const [shortcut, emoji] of Object.entries(EMOJI_SHORTCUTS)) {
    // Escape special regex characters in shortcut
    const escaped = shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), emoji);
  }

  return result;
}

/**
 * Build emoji TextRun
 */
export function buildEmojiRun(emoji: string): TextRun {
  return new TextRun({
    text: emoji,
    font: 'Segoe UI Emoji',
    size: 24,
  });
}

/**
 * Build icon paragraph (centered emoji)
 */
export function buildIconParagraph(
  emoji: string,
  size: 'small' | 'medium' | 'large' = 'medium',
  theme?: DocumentTheme,
): Paragraph {
  const sizeMap = {
    small: 24,
    medium: 36,
    large: 48,
  };

  return new Paragraph({
    alignment: 'center',
    children: [
      new TextRun({
        text: emoji,
        font: 'Segoe UI Emoji',
        size: sizeMap[size],
      }),
    ],
    spacing: { before: 100, after: 100 },
  });
}

/**
 * Parse icon syntax
 * Syntax: [ICON:emoji:size]
 */
export function parseIconSyntax(
  line: string,
): { emoji: string; size: 'small' | 'medium' | 'large' } | null {
  const match = line.trim().match(/^\[ICON:([^:\]]+)(?::(\w+))?\]$/i);
  if (!match) return null;

  const emoji = EMOJI_SHORTCUTS[`:${match[1]}:`] || match[1];
  const size = (match[2]?.toLowerCase() as 'small' | 'medium' | 'large') || 'medium';

  return { emoji, size };
}

/**
 * Get all available emoji shortcuts
 */
export function getEmojiShortcuts(): Record<string, string> {
  return { ...EMOJI_SHORTCUTS };
}

/**
 * Check if text contains emoji shortcuts
 */
export function hasEmojiShortcuts(text: string): boolean {
  return Object.keys(EMOJI_SHORTCUTS).some((shortcut) => text.includes(shortcut));
}

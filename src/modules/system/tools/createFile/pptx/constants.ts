/**
 * PowerPoint Constants - Các hằng số cho PPTX framework
 */

// ═══════════════════════════════════════════════════
// LAYOUTS
// ═══════════════════════════════════════════════════

export const LAYOUTS = {
  '16x9': 'LAYOUT_16x9',
  '16x10': 'LAYOUT_16x10',
  '4x3': 'LAYOUT_4x3',
  wide: 'LAYOUT_WIDE',
} as const;

export const LAYOUT_DIMENSIONS = {
  LAYOUT_16x9: { width: 10, height: 5.625 },
  LAYOUT_16x10: { width: 10, height: 6.25 },
  LAYOUT_4x3: { width: 10, height: 7.5 },
  LAYOUT_WIDE: { width: 13.33, height: 7.5 },
} as const;

// ═══════════════════════════════════════════════════
// FONT SIZES
// ═══════════════════════════════════════════════════

export const FONT_SIZES = {
  title: 44,
  titleSlide: 54,
  subtitle: 24,
  sectionTitle: 40,
  heading: 32,
  subheading: 24,
  body: 18,
  bullet: 18,
  code: 14,
  caption: 12,
  footer: 10,
  pageNumber: 10,
} as const;

// ═══════════════════════════════════════════════════
// POSITIONS (inches from top-left)
// ═══════════════════════════════════════════════════

export const POSITIONS = {
  // Title slide
  titleSlide: {
    title: { x: 0.5, y: 2.0, w: '90%', h: 1.5 },
    subtitle: { x: 0.5, y: 3.5, w: '90%', h: 1.0 },
    author: { x: 0.5, y: 4.5, w: '90%', h: 0.5 },
  },
  // Content slide
  content: {
    title: { x: 0.5, y: 0.5, w: '90%', h: 1.0 },
    subtitle: { x: 0.5, y: 1.4, w: '90%', h: 0.6 },
    body: { x: 0.5, y: 2.0, w: '90%', h: 4.0 },
    code: { x: 0.5, y: 2.0, w: '90%', h: 3.0 },
  },
  // Two column
  twoColumn: {
    title: { x: 0.5, y: 0.5, w: '90%', h: 1.0 },
    leftColumn: { x: 0.5, y: 1.8, w: '44%', h: 4.0 },
    rightColumn: { x: 5.2, y: 1.8, w: '44%', h: 4.0 },
  },
  // Image slide
  imageSlide: {
    title: { x: 0.5, y: 0.5, w: '90%', h: 0.8 },
    image: { x: 1.0, y: 1.5, w: 8.0, h: 4.0 },
    caption: { x: 0.5, y: 5.0, w: '90%', h: 0.5 },
  },
  // Quote slide
  quote: {
    text: { x: 1.0, y: 1.5, w: '80%', h: 3.0 },
    author: { x: 1.0, y: 4.5, w: '80%', h: 0.5 },
  },
  // Footer
  footer: {
    left: { x: 0.5, y: '95%', w: 3.0, h: 0.3 },
    center: { x: '40%', y: '95%', w: 2.0, h: 0.3 },
    right: { x: '85%', y: '95%', w: 1.0, h: 0.3 },
  },
} as const;

// ═══════════════════════════════════════════════════
// BULLET STYLES
// ═══════════════════════════════════════════════════

export const BULLET_STYLES = {
  default: { type: 'bullet' },
  circle: { type: 'bullet', code: '●' },
  square: { type: 'bullet', code: '■' },
  diamond: { type: 'bullet', code: '◆' },
  arrow: { type: 'bullet', code: '➤' },
  check: { type: 'bullet', code: '✓' },
  star: { type: 'bullet', code: '★' },
  dash: { type: 'bullet', code: '—' },
} as const;

// ═══════════════════════════════════════════════════
// TRANSITIONS
// ═══════════════════════════════════════════════════

export const TRANSITIONS = {
  none: null,
  fade: { type: 'fade' },
  push: { type: 'push' },
  wipe: { type: 'wipe' },
  split: { type: 'split' },
  reveal: { type: 'reveal' },
  cover: { type: 'cover' },
  dissolve: { type: 'dissolve' },
} as const;

// ═══════════════════════════════════════════════════
// SHAPE TYPES
// ═══════════════════════════════════════════════════

export const SHAPE_TYPES = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  arrow: 'rightArrow',
  star: 'star5',
  callout: 'wedgeRectCallout',
  cloud: 'cloud',
  heart: 'heart',
  lightning: 'lightningBolt',
} as const;

// ═══════════════════════════════════════════════════
// CHART TYPES
// ═══════════════════════════════════════════════════

export const CHART_TYPES = {
  bar: 'bar',
  bar3D: 'bar3D',
  line: 'line',
  area: 'area',
  pie: 'pie',
  pie3D: 'pie3D',
  doughnut: 'doughnut',
  scatter: 'scatter',
  radar: 'radar',
} as const;

// ═══════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════

export const COLORS = {
  // Basic
  white: 'FFFFFF',
  black: '000000',
  gray: '808080',
  lightGray: 'D3D3D3',
  darkGray: '404040',

  // Primary
  blue: '0066CC',
  red: 'CC0000',
  green: '00CC00',
  yellow: 'FFCC00',
  orange: 'FF6600',
  purple: '6600CC',
  pink: 'FF66CC',
  cyan: '00CCCC',

  // Status
  success: '28A745',
  warning: 'FFC107',
  danger: 'DC3545',
  info: '17A2B8',

  // Semantic
  primary: '0066CC',
  secondary: '6C757D',
  accent: 'FF6600',
} as const;

// ═══════════════════════════════════════════════════
// ICONS (Unicode)
// ═══════════════════════════════════════════════════

export const ICONS = {
  check: '✓',
  cross: '✗',
  star: '★',
  starEmpty: '☆',
  heart: '♥',
  diamond: '◆',
  circle: '●',
  circleEmpty: '○',
  square: '■',
  squareEmpty: '□',
  triangle: '▲',
  triangleDown: '▼',
  arrow: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',
  bullet: '•',
  dash: '—',
  plus: '+',
  minus: '−',
  warning: '⚠',
  info: 'ℹ',
  question: '?',
  exclamation: '!',
  lightbulb: '💡',
  fire: '🔥',
  rocket: '🚀',
  thumbsUp: '👍',
  thumbsDown: '👎',
  clock: '🕐',
  calendar: '📅',
  folder: '📁',
  file: '📄',
  email: '✉',
  phone: '📞',
  location: '📍',
  link: '🔗',
  lock: '🔒',
  unlock: '🔓',
  settings: '⚙',
  search: '🔍',
  user: '👤',
  users: '👥',
  chart: '📊',
  money: '💰',
  trophy: '🏆',
  target: '🎯',
} as const;

// ═══════════════════════════════════════════════════
// SLIDE SEPARATORS
// ═══════════════════════════════════════════════════

export const SLIDE_SEPARATORS = [
  /\n---\n/,
  /\n\*\*\*\n/,
  /\n___\n/,
  /\[SLIDE\]/i,
  /\[NEW_SLIDE\]/i,
] as const;

// ═══════════════════════════════════════════════════
// CALLOUT TYPES
// ═══════════════════════════════════════════════════

export const CALLOUT_STYLES = {
  info: {
    icon: 'ℹ️',
    backgroundColor: 'E3F2FD',
    borderColor: '2196F3',
    textColor: '0D47A1',
  },
  tip: {
    icon: '💡',
    backgroundColor: 'E8F5E9',
    borderColor: '4CAF50',
    textColor: '1B5E20',
  },
  note: {
    icon: '📝',
    backgroundColor: 'FFF8E1',
    borderColor: 'FFC107',
    textColor: 'F57F17',
  },
  warning: {
    icon: '⚠️',
    backgroundColor: 'FFF3E0',
    borderColor: 'FF9800',
    textColor: 'E65100',
  },
  important: {
    icon: '❗',
    backgroundColor: 'FCE4EC',
    borderColor: 'E91E63',
    textColor: '880E4F',
  },
  success: {
    icon: '✅',
    backgroundColor: 'E8F5E9',
    borderColor: '4CAF50',
    textColor: '1B5E20',
  },
  error: {
    icon: '❌',
    backgroundColor: 'FFEBEE',
    borderColor: 'F44336',
    textColor: 'B71C1C',
  },
} as const;

// ═══════════════════════════════════════════════════
// BOX STYLES
// ═══════════════════════════════════════════════════

export const BOX_STYLES = {
  info: {
    fill: 'E3F2FD',
    border: '2196F3',
    titleColor: '1565C0',
    textColor: '0D47A1',
  },
  success: {
    fill: 'E8F5E9',
    border: '4CAF50',
    titleColor: '2E7D32',
    textColor: '1B5E20',
  },
  warning: {
    fill: 'FFF3E0',
    border: 'FF9800',
    titleColor: 'EF6C00',
    textColor: 'E65100',
  },
  error: {
    fill: 'FFEBEE',
    border: 'F44336',
    titleColor: 'C62828',
    textColor: 'B71C1C',
  },
  note: {
    fill: 'FFF8E1',
    border: 'FFC107',
    titleColor: 'F9A825',
    textColor: 'F57F17',
  },
  quote: {
    fill: 'F3E5F5',
    border: '9C27B0',
    titleColor: '7B1FA2',
    textColor: '4A148C',
  },
  code: {
    fill: 'ECEFF1',
    border: '607D8B',
    titleColor: '455A64',
    textColor: '263238',
  },
} as const;

// ═══════════════════════════════════════════════════
// BADGE STYLES
// ═══════════════════════════════════════════════════

export const BADGE_STYLES = {
  default: { fill: '6C757D', text: 'FFFFFF' },
  primary: { fill: '0066CC', text: 'FFFFFF' },
  success: { fill: '28A745', text: 'FFFFFF' },
  warning: { fill: 'FFC107', text: '000000' },
  danger: { fill: 'DC3545', text: 'FFFFFF' },
  info: { fill: '17A2B8', text: 'FFFFFF' },
} as const;

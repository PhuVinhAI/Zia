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
// SLIDE SEPARATORS
// ═══════════════════════════════════════════════════

export const SLIDE_SEPARATORS = [
  /\n---\n/,
  /\n\*\*\*\n/,
  /\n___\n/,
  /\[SLIDE\]/i,
  /\[NEW_SLIDE\]/i,
] as const;



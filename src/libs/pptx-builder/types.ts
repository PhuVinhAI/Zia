/**
 * PowerPoint Types - Định nghĩa types cho PPTX framework
 */

// ═══════════════════════════════════════════════════
// PRESENTATION OPTIONS
// ═══════════════════════════════════════════════════

export interface PresentationOptions {
  filename?: string;
  content?: string;
  title?: string;
  author?: string;
  subject?: string;
  company?: string;

  // Layout
  layout?: LayoutType;

  // Theme
  theme?: PresentationTheme;

  // Master slide
  masterSlide?: MasterSlideConfig;

  // Slide numbering
  showSlideNumbers?: boolean;

  // Transitions
  defaultTransition?: TransitionType;
}

export type LayoutType = 'LAYOUT_16x9' | 'LAYOUT_16x10' | 'LAYOUT_4x3' | 'LAYOUT_WIDE';

export type TransitionType =
  | 'none'
  | 'fade'
  | 'push'
  | 'wipe'
  | 'split'
  | 'reveal'
  | 'cover'
  | 'dissolve';

// ═══════════════════════════════════════════════════
// THEME & STYLING
// ═══════════════════════════════════════════════════

export interface PresentationTheme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  titleText: string;
  bodyText: string;
  link: string;
  codeBackground: string;
  footerBackground: string;
}

export interface ThemeFonts {
  title: string;
  subtitle: string;
  body: string;
  code: string;
}

export interface ThemeSpacing {
  titleY: number;
  subtitleY: number;
  contentY: number;
  bulletSpacing: number;
  lineHeight: number;
}

// ═══════════════════════════════════════════════════
// MASTER SLIDE
// ═══════════════════════════════════════════════════

export interface MasterSlideConfig {
  background?: BackgroundConfig;
  logo?: LogoConfig;
  footer?: FooterConfig;
  headerBar?: HeaderBarConfig;
  footerBar?: FooterBarConfig;
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradientColors?: string[];
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
  imageData?: string;
}

export interface LogoConfig {
  data: string;
  x: number | string;
  y: number | string;
  width: number;
  height: number;
}

export interface FooterConfig {
  text?: string;
  showDate?: boolean;
  showSlideNumber?: boolean;
}

export interface HeaderBarConfig {
  height: string;
  color: string;
}

export interface FooterBarConfig {
  height: string;
  color: string;
  y: string;
}

// ═══════════════════════════════════════════════════
// SLIDE TYPES
// ═══════════════════════════════════════════════════

export type SlideType =
  | 'title'
  | 'content'
  | 'section'
  | 'twoColumn'
  | 'comparison'
  | 'imageOnly'
  | 'blank'
  | 'quote'
  | 'agenda'
  | 'thankyou';

export interface SlideConfig {
  type: SlideType;
  title?: string;
  subtitle?: string;
  content?: SlideContent;
  background?: BackgroundConfig;
  transition?: TransitionType;
  notes?: string;
}

export interface SlideContent {
  bullets?: BulletItem[];
  numberedList?: string[];
  text?: string;
  image?: ImageConfig;
  images?: ImageConfig[];
  table?: TableConfig;
  chart?: ChartConfig;
  code?: CodeConfig;
  quote?: QuoteConfig;
  columns?: ColumnContent[];
  shapes?: ShapeConfig[];
  icons?: IconConfig[];
}

// ═══════════════════════════════════════════════════
// CONTENT ELEMENTS
// ═══════════════════════════════════════════════════

export interface BulletItem {
  text: string;
  level: number;
  icon?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface ImageConfig {
  data: string;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  caption?: string;
  rounded?: boolean;
  shadow?: boolean;
}

export interface TableConfig {
  headers: string[];
  rows: string[][];
  style?: TableStyle;
  x?: number | string;
  y?: number | string;
  width?: number | string;
}

export interface TableStyle {
  headerBackground?: string;
  headerTextColor?: string;
  rowBackground?: string;
  alternateRowBackground?: string;
  borderColor?: string;
  fontSize?: number;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title?: string;
  data: ChartData[];
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  showLegend?: boolean;
  showValues?: boolean;
}

export interface ChartData {
  name: string;
  labels: string[];
  values: number[];
  color?: string;
}

export interface CodeConfig {
  code: string;
  language?: string;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  fontSize?: number;
}

export interface QuoteConfig {
  text: string;
  author?: string;
  source?: string;
}

export interface ColumnContent {
  title?: string;
  bullets?: string[];
  image?: ImageConfig;
  text?: string;
}

export interface ShapeConfig {
  type: ShapeType;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  fill?: string;
  line?: { color: string; width: number };
  text?: string;
  fontSize?: number;
  fontColor?: string;
}

export type ShapeType =
  | 'rect'
  | 'roundRect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'arrow'
  | 'star'
  | 'callout';

export interface IconConfig {
  name: string;
  x: number | string;
  y: number | string;
  size?: number;
  color?: string;
}

// ═══════════════════════════════════════════════════
// PARSED CONTENT
// ═══════════════════════════════════════════════════

export interface ParsedSlide {
  type: SlideType;
  title?: string;
  subtitle?: string;
  bullets: ParsedBullet[];
  numberedItems: string[];
  codeBlocks: ParsedCodeBlock[];
  images: ParsedImage[];
  table?: ParsedTable;
  quote?: QuoteConfig;
  notes?: string;
  background?: BackgroundConfig;
  transition?: TransitionType;
}

export interface ParsedBullet {
  text: string;
  level: number;
  checked?: boolean;
  styles: TextStyle[];
}

export interface ParsedCodeBlock {
  code: string;
  language?: string;
}

export interface ParsedImage {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export type TextStyle = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';

// ═══════════════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════════════

export interface AnimationConfig {
  type: AnimationType;
  delay?: number;
  duration?: number;
}

export type AnimationType = 'appear' | 'fade' | 'fly' | 'float' | 'split' | 'wipe' | 'zoom';

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export interface ExportOptions {
  format: 'pptx' | 'pdf';
  quality?: 'low' | 'medium' | 'high';
}

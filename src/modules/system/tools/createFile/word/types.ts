/**
 * Word Document Types - Định nghĩa types cho Word framework
 */

// ═══════════════════════════════════════════════════
// DOCUMENT STRUCTURE TYPES
// ═══════════════════════════════════════════════════

export interface WordDocumentOptions {
  // Base options
  filename?: string;
  content?: string;
  title?: string;
  author?: string;
  // Page settings
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: PageMargins;

  // Header/Footer
  header?: HeaderFooterConfig;
  footer?: HeaderFooterConfig;

  // Styling
  theme?: DocumentTheme;
  defaultFont?: string;
  defaultFontSize?: number;

  // Table of Contents
  includeToc?: boolean;
  tocTitle?: string;

  // Watermark
  watermark?: WatermarkConfig;
}

export interface PageMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface HeaderFooterConfig {
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  includePageNumber?: boolean;
  pageNumberFormat?: 'decimal' | 'roman' | 'romanUpper';
}

export interface WatermarkConfig {
  text: string;
  color?: string;
  opacity?: number;
}

// ═══════════════════════════════════════════════════
// THEME & STYLING
// ═══════════════════════════════════════════════════

export interface DocumentTheme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  heading: string;
  text: string;
  link: string;
  codeBackground: string;
  tableBorder: string;
  tableHeader: string;
  tableStripe: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  code: string;
}

export interface ThemeSpacing {
  paragraphAfter: number;
  headingBefore: number;
  headingAfter: number;
  listItemAfter: number;
  lineSpacing: number;
}

// ═══════════════════════════════════════════════════
// TABLE TYPES
// ═══════════════════════════════════════════════════

export interface TableData {
  headers: string[];
  rows: string[][];
  style?: TableStyle;
}

export interface TableStyle {
  headerBackground?: string;
  headerTextColor?: string;
  stripedRows?: boolean;
  stripeColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

// ═══════════════════════════════════════════════════
// IMAGE TYPES
// ═══════════════════════════════════════════════════

export interface ImageConfig {
  data: Buffer | string; // Buffer or base64
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
  caption?: string;
}

// ═══════════════════════════════════════════════════
// CONTENT BLOCK TYPES (Extended)
// ═══════════════════════════════════════════════════

export type ExtendedBlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'paragraph'
  | 'bullet'
  | 'numbered'
  | 'checklist'
  | 'blockquote'
  | 'codeBlock'
  | 'hr'
  | 'empty'
  | 'table'
  | 'image'
  | 'pageBreak'
  | 'footnote'
  | 'callout';

export interface ExtendedBlock {
  type: ExtendedBlockType;
  tokens: InlineToken[];
  indent?: number;
  language?: string;
  raw?: string;
  tableData?: TableData;
  imageConfig?: ImageConfig;
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  checked?: boolean; // for checklist
}

export interface InlineToken {
  text: string;
  styles: InlineStyle[];
  href?: string;
  footnoteId?: string;
}

export type InlineStyle =
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'underline'
  | 'subscript'
  | 'superscript'
  | 'highlight';

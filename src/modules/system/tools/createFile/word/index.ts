/**
 * Word Framework - Full-featured Word document generation
 * Export tất cả components
 */

// ═══════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════
export {
  type BadgeConfig,
  buildBadgeParagraph,
  buildBadgeRun,
  hasBadges,
  parseBadges,
  removeBadgeSyntax,
} from './badgeBuilder.js';
// ═══════════════════════════════════════════════════
// BOXES
// ═══════════════════════════════════════════════════
export {
  type BoxConfig,
  type BoxType,
  buildBox,
  buildSimpleBox,
  hasBoxSyntax,
  parseBoxSyntax,
} from './boxBuilder.js';
// ═══════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════
export {
  buildColumnBreak,
  buildColumnSectionProperties,
  buildSingleColumnSectionProperties,
  type ColumnConfig,
  type ColumnSection,
  isColumnBreak,
  parseColumnSections,
} from './columnBuilder.js';
// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
export {
  ALIGNMENTS,
  CALLOUT_STYLES,
  DEFAULT_MARGINS,
  FONT_SIZES,
  getMargins,
  getPageSize,
  HEADING_LEVELS,
  NUMBERING_FORMATS,
  ORIENTATIONS,
  PAGE_SIZES,
} from './constants.js';
// ═══════════════════════════════════════════════════
// CONTENT BUILDER
// ═══════════════════════════════════════════════════
export {
  blockToParagraph,
  buildAlignedParagraph,
  buildCallout,
  buildCodeBlock,
  buildPageBreak,
  parseExtendedContent,
  tokensToTextRuns,
} from './contentBuilder.js';
// ═══════════════════════════════════════════════════
// COVER PAGES
// ═══════════════════════════════════════════════════
export {
  buildCoverPage,
  buildTitleBlock,
  type CoverPageConfig,
  hasCoverPageSyntax,
  parseCoverPageSyntax,
  removeCoverPageSyntax,
} from './coverPageBuilder.js';
// ═══════════════════════════════════════════════════
// DIVIDERS
// ═══════════════════════════════════════════════════
export {
  buildDecoratedDivider,
  buildDivider,
  buildOrnamentDivider,
  buildStarDivider,
  type DividerConfig,
  type DividerStyle,
  isDivider,
  parseDividerSyntax,
} from './dividerBuilder.js';
// ═══════════════════════════════════════════════════
// DOCUMENT BUILDER (Main)
// ═══════════════════════════════════════════════════
export {
  buildSimpleDocument,
  buildWordDocument,
  WordDocumentBuilder,
} from './documentBuilder.js';
// ═══════════════════════════════════════════════════
// EMOJIS
// ═══════════════════════════════════════════════════
export {
  buildEmojiRun,
  buildIconParagraph,
  getEmojiShortcuts,
  hasEmojiShortcuts,
  parseIconSyntax,
  replaceEmojiShortcuts,
} from './emojiBuilder.js';
// ═══════════════════════════════════════════════════
// FOOTNOTES
// ═══════════════════════════════════════════════════
export {
  buildFootnoteContent,
  buildFootnoteReference,
  type FootnoteData,
  hasFootnoteReference,
  markFootnoteReferences,
  parseFootnotes,
} from './footnoteBuilder.js';
// ═══════════════════════════════════════════════════
// HEADER/FOOTER
// ═══════════════════════════════════════════════════
export {
  buildDefaultFooter,
  buildDefaultHeader,
  buildFooter,
  buildHeader,
} from './headerFooter.js';
// ═══════════════════════════════════════════════════
// HIGHLIGHTS
// ═══════════════════════════════════════════════════
export {
  buildHighlightedParagraph,
  buildHighlightedRun,
  buildMarkedRun,
  type HighlightColorName,
  type HighlightConfig,
  hasHighlights,
  parseHighlights,
} from './highlightBuilder.js';
// ═══════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════
export {
  buildImageParagraph,
  parseImageSyntax,
} from './imageBuilder.js';
// ═══════════════════════════════════════════════════
// LISTS (Advanced)
// ═══════════════════════════════════════════════════
export {
  buildChecklist,
  buildChecklistItem,
  buildDefinitionList,
  type ChecklistItem,
  calculateIndentLevel,
  type DefinitionItem,
  isListItem,
  parseChecklist,
  parseDefinitionList,
} from './listBuilder.js';

// ═══════════════════════════════════════════════════
// MATH
// ═══════════════════════════════════════════════════
export {
  buildMathParagraph,
  hasMathExpression,
  type MathExpression,
  parseMathExpressions,
  renderMathExpression,
} from './mathBuilder.js';
// ═══════════════════════════════════════════════════
// SIGNATURES
// ═══════════════════════════════════════════════════
export {
  buildApprovalBlock,
  buildSignatureBlock,
  isSignatureSyntax,
  type MultiSignatureConfig,
  parseApprovalSyntax,
  parseSignatureSyntax,
  type SignatureConfig,
} from './signatureBuilder.js';
// ═══════════════════════════════════════════════════
// STYLE BUILDER
// ═══════════════════════════════════════════════════
export { buildDocumentStyles, buildNumberingConfig } from './styleBuilder.js';
// ═══════════════════════════════════════════════════
// TABLE BUILDER
// ═══════════════════════════════════════════════════
export { buildTable, buildTableFromCSV, parseMarkdownTable } from './tableBuilder.js';
// ═══════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════
export { getTheme, getThemeNames, THEMES } from './themes.js';
// ═══════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════
export {
  buildManualTOC,
  buildTableOfContents,
  extractHeadings,
} from './tocBuilder.js';
// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
export * from './types.js';
// ═══════════════════════════════════════════════════
// WATERMARKS
// ═══════════════════════════════════════════════════
export {
  buildConfidentialWatermark,
  buildDraftWatermark,
  buildSampleWatermark,
  buildWatermarkHeader,
  getPredefinedWatermark,
  PREDEFINED_WATERMARKS,
  parseWatermarkSyntax,
  removeWatermarkSyntax,
} from './watermarkBuilder.js';

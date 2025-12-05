/**
 * Word Framework - Full-featured Word document generation
 * Export tất cả components
 */

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
export * from './types.js';

// ═══════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════
export { getTheme, getThemeNames, THEMES } from './themes.js';

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
// STYLE BUILDER
// ═══════════════════════════════════════════════════
export { buildDocumentStyles, buildNumberingConfig } from './styleBuilder.js';

// ═══════════════════════════════════════════════════
// TABLE BUILDER
// ═══════════════════════════════════════════════════
export { buildTable, buildTableFromCSV, parseMarkdownTable } from './tableBuilder.js';

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
// HEADER/FOOTER
// ═══════════════════════════════════════════════════
export {
  buildDefaultFooter,
  buildDefaultHeader,
  buildFooter,
  buildHeader,
} from './headerFooter.js';

// ═══════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════
export {
  buildManualTOC,
  buildTableOfContents,
  extractHeadings,
} from './tocBuilder.js';

// ═══════════════════════════════════════════════════
// FOOTNOTES
// ═══════════════════════════════════════════════════
export {
  buildFootnoteContent,
  buildFootnoteReference,
  hasFootnoteReference,
  markFootnoteReferences,
  parseFootnotes,
  type FootnoteData,
} from './footnoteBuilder.js';

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
  calculateIndentLevel,
  isListItem,
  parseChecklist,
  parseDefinitionList,
  type ChecklistItem,
  type DefinitionItem,
} from './listBuilder.js';

// ═══════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════
export {
  buildColumnBreak,
  buildColumnSectionProperties,
  buildSingleColumnSectionProperties,
  isColumnBreak,
  parseColumnSections,
  type ColumnConfig,
  type ColumnSection,
} from './columnBuilder.js';

// ═══════════════════════════════════════════════════
// DIVIDERS
// ═══════════════════════════════════════════════════
export {
  buildDecoratedDivider,
  buildDivider,
  buildOrnamentDivider,
  buildStarDivider,
  isDivider,
  parseDividerSyntax,
  type DividerConfig,
  type DividerStyle,
} from './dividerBuilder.js';

// ═══════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════
export {
  buildBadgeParagraph,
  buildBadgeRun,
  hasBadges,
  parseBadges,
  removeBadgeSyntax,
  type BadgeConfig,
} from './badgeBuilder.js';

// ═══════════════════════════════════════════════════
// MATH
// ═══════════════════════════════════════════════════
export {
  buildMathParagraph,
  hasMathExpression,
  parseMathExpressions,
  renderMathExpression,
  type MathExpression,
} from './mathBuilder.js';

// ═══════════════════════════════════════════════════
// BOXES
// ═══════════════════════════════════════════════════
export {
  buildBox,
  buildSimpleBox,
  hasBoxSyntax,
  parseBoxSyntax,
  type BoxConfig,
  type BoxType,
} from './boxBuilder.js';

// ═══════════════════════════════════════════════════
// HIGHLIGHTS
// ═══════════════════════════════════════════════════
export {
  buildHighlightedParagraph,
  buildHighlightedRun,
  buildMarkedRun,
  hasHighlights,
  parseHighlights,
  type HighlightColorName,
  type HighlightConfig,
} from './highlightBuilder.js';

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
// WATERMARKS
// ═══════════════════════════════════════════════════
export {
  buildConfidentialWatermark,
  buildDraftWatermark,
  buildSampleWatermark,
  buildWatermarkHeader,
  getPredefinedWatermark,
  parseWatermarkSyntax,
  PREDEFINED_WATERMARKS,
  removeWatermarkSyntax,
} from './watermarkBuilder.js';

// ═══════════════════════════════════════════════════
// SIGNATURES
// ═══════════════════════════════════════════════════
export {
  buildApprovalBlock,
  buildSignatureBlock,
  isSignatureSyntax,
  parseApprovalSyntax,
  parseSignatureSyntax,
  type MultiSignatureConfig,
  type SignatureConfig,
} from './signatureBuilder.js';

// ═══════════════════════════════════════════════════
// COVER PAGES
// ═══════════════════════════════════════════════════
export {
  buildCoverPage,
  buildTitleBlock,
  hasCoverPageSyntax,
  parseCoverPageSyntax,
  removeCoverPageSyntax,
  type CoverPageConfig,
} from './coverPageBuilder.js';

// ═══════════════════════════════════════════════════
// DOCUMENT BUILDER (Main)
// ═══════════════════════════════════════════════════
export {
  buildSimpleDocument,
  buildWordDocument,
  WordDocumentBuilder,
} from './documentBuilder.js';

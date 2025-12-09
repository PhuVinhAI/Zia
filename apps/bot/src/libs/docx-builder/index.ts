/**
 * Word Framework - Full-featured Word document generation
 * Export tất cả components
 */

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
// LISTS (Definition List)
// ═══════════════════════════════════════════════════
export {
  buildDefinitionList,
  type DefinitionItem,
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

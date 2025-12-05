/**
 * Word Framework - Export tất cả components
 * Full-featured Word document generation framework
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
// DOCUMENT BUILDER (Main)
// ═══════════════════════════════════════════════════
export {
  buildSimpleDocument,
  buildWordDocument,
  WordDocumentBuilder,
} from './documentBuilder.js';

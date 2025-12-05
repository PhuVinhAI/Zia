/**
 * Word Framework - Export tất cả components
 */

// Types
export * from './types.js';

// Themes
export { getTheme, getThemeNames, THEMES } from './themes.js';

// Constants
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

// Style Builder
export { buildDocumentStyles, buildNumberingConfig } from './styleBuilder.js';

// Table Builder
export { buildTable, buildTableFromCSV, parseMarkdownTable } from './tableBuilder.js';

// Content Builder
export {
  blockToParagraph,
  buildCallout,
  buildCodeBlock,
  buildPageBreak,
  parseExtendedContent,
  tokensToTextRuns,
} from './contentBuilder.js';

// Header/Footer
export {
  buildDefaultFooter,
  buildDefaultHeader,
  buildFooter,
  buildHeader,
} from './headerFooter.js';

// Document Builder
export {
  buildSimpleDocument,
  buildWordDocument,
  WordDocumentBuilder,
} from './documentBuilder.js';

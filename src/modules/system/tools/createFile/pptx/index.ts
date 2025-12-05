/**
 * PPTX Framework - Full-featured PowerPoint presentation generation
 * Export tất cả components
 */

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
export * from './types.js';

// ═══════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════
export { getTheme, getThemeNames, isDarkTheme, THEMES } from './themes.js';

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════
export {
  BADGE_STYLES,
  BOX_STYLES,
  BULLET_STYLES,
  CALLOUT_STYLES,
  CHART_TYPES,
  COLORS,
  FONT_SIZES,
  ICONS,
  LAYOUT_DIMENSIONS,
  LAYOUTS,
  POSITIONS,
  SHAPE_TYPES,
  SLIDE_SEPARATORS,
  TRANSITIONS,
} from './constants.js';

// ═══════════════════════════════════════════════════
// CONTENT PARSER
// ═══════════════════════════════════════════════════
export {
  parseContent,
  parseOptions,
  parseSlide,
  splitIntoSlides,
} from './contentParser.js';

// ═══════════════════════════════════════════════════
// MASTER SLIDES
// ═══════════════════════════════════════════════════
export {
  createMasterSlides,
  getMasterForSlideType,
} from './masterSlide.js';

// ═══════════════════════════════════════════════════
// SLIDE BUILDER
// ═══════════════════════════════════════════════════
export { buildSlide } from './slideBuilder.js';

// ═══════════════════════════════════════════════════
// TABLE BUILDER
// ═══════════════════════════════════════════════════
export {
  buildComparisonTable,
  buildFeatureTable,
  buildStyledTable,
  buildTable,
  parseMarkdownTable,
} from './tableBuilder.js';

// ═══════════════════════════════════════════════════
// CODE BUILDER
// ═══════════════════════════════════════════════════
export {
  buildCodeBlock,
  buildCodeComparison,
  buildInlineCode,
  buildStyledCodeBlock,
  highlightCode,
} from './codeBuilder.js';

// ═══════════════════════════════════════════════════
// CHART BUILDER
// ═══════════════════════════════════════════════════
export {
  buildAreaChart,
  buildBarChart,
  buildChart,
  buildLineChart,
  buildMiniChart,
  buildPieChart,
  buildStatCard,
} from './chartBuilder.js';

// ═══════════════════════════════════════════════════
// IMAGE BUILDER
// ═══════════════════════════════════════════════════
export {
  buildIcon,
  buildImage,
  buildImageGallery,
  buildImageWithText,
  buildLogo,
  buildPlaceholderImage,
  buildPositionedImage,
  setBackgroundImage,
} from './imageBuilder.js';

// ═══════════════════════════════════════════════════
// SHAPE BUILDER
// ═══════════════════════════════════════════════════
export {
  buildArrow,
  buildBadge,
  buildBox,
  buildCallout,
  buildDecoratedDivider,
  buildDivider,
  buildIconGrid,
  buildProcessFlow,
  buildShape,
  buildTimeline,
} from './shapeBuilder.js';

// ═══════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════
export { darkenColor, lightenColor, safeColor } from './utils.js';

// ═══════════════════════════════════════════════════
// PRESENTATION BUILDER (Main)
// ═══════════════════════════════════════════════════
export {
  buildPresentation,
  buildSimplePresentation,
  PresentationBuilder,
} from './presentationBuilder.js';

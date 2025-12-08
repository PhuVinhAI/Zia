/**
 * Modules - Feature modules
 */

// Gateway - Message processing pipeline
export { gatewayModule } from './gateway/gateway.module.js';
export * from './gateway/gateway.module.js';

// System - Core tools
export { systemModule } from './system/system.module.js';

// Entertainment - Anime, media tools
export { entertainmentModule } from './entertainment/entertainment.module.js';

// Academic - TVU Portal tools
export { academicModule } from './academic/academic.module.js';

// Background Agent - Scheduled tasks
export * from './background-agent/index.js';

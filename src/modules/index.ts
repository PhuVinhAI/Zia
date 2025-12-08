/**
 * Modules - Feature modules
 */

// Academic - TVU Portal tools
export { academicModule } from './academic/academic.module.js';
// Background Agent - Scheduled tasks
export * from './background-agent/index.js';
// Chat - History và memory
export { chatModule } from './chat/chat.module.js';
// Entertainment - Anime, media tools
export { entertainmentModule } from './entertainment/entertainment.module.js';
export * from './gateway/gateway.module.js';
// Gateway - Message processing pipeline
export { gatewayModule } from './gateway/gateway.module.js';
// Media - Charts, files, images, TTS
export { mediaModule } from './media/media.module.js';
// Search - Web search, YouTube, weather
export { searchModule } from './search/search.module.js';
// Social - User info, friends, groups
export { socialModule } from './social/social.module.js';
// System - Utility tools
export { systemModule } from './system/system.module.js';
// Task - Code execution, math, scheduling
export { taskModule } from './task/task.module.js';

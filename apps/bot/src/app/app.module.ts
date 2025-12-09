/**
 * App Module - Đăng ký và khởi tạo các modules
 */
import { container, eventBus, moduleManager, Services } from '../core/index.js';
import { databaseService } from '../infrastructure/database/index.js';

// Import module instances
import { academicModule } from '../modules/academic/academic.module.js';
import { chatModule } from '../modules/chat/chat.module.js';
import { entertainmentModule } from '../modules/entertainment/entertainment.module.js';
import { gatewayModule } from '../modules/gateway/gateway.module.js';
import { mediaModule } from '../modules/media/media.module.js';
import { searchModule } from '../modules/search/search.module.js';
import { socialModule } from '../modules/social/social.module.js';
import { systemModule } from '../modules/system/system.module.js';
import { taskModule } from '../modules/task/task.module.js';

/**
 * Đăng ký tất cả modules vào ModuleManager
 */
export async function registerModules(): Promise<void> {
  // Initialize database first
  databaseService.init();
  container.register(Services.DATABASE, databaseService);

  // Register core services
  container.register(Services.EVENT_BUS, eventBus);
  container.register(Services.MODULE_MANAGER, moduleManager);

  // Register modules (thứ tự quan trọng nếu có dependencies)
  await moduleManager.register(gatewayModule);
  await moduleManager.register(systemModule);
  await moduleManager.register(chatModule);
  await moduleManager.register(mediaModule);
  await moduleManager.register(searchModule);
  await moduleManager.register(socialModule);
  await moduleManager.register(taskModule);
  await moduleManager.register(academicModule);
  await moduleManager.register(entertainmentModule);
}

/**
 * Load tất cả modules
 */
export async function loadModules(): Promise<void> {
  await moduleManager.loadAll();
}

/**
 * Khởi tạo app (register + load)
 */
export async function initializeApp(): Promise<void> {
  await registerModules();
  await loadModules();
}

// Export module instances for direct access
export {
  academicModule,
  chatModule,
  entertainmentModule,
  gatewayModule,
  mediaModule,
  searchModule,
  socialModule,
  systemModule,
  taskModule,
};

// Export module manager
export { moduleManager };

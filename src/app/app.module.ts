/**
 * App Module - Đăng ký và khởi tạo các modules
 */
import { container, eventBus, moduleManager, Services } from '../core/index.js';
import { databaseService } from '../infrastructure/database/index.js';
import { academicModule } from '../modules/academic/academic.module.js';
import { entertainmentModule } from '../modules/entertainment/entertainment.module.js';
import { gatewayModule } from '../modules/gateway/gateway.module.js';
// Import module instances
import { systemModule } from '../modules/system/system.module.js';

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
export { systemModule, academicModule, entertainmentModule, gatewayModule };

// Export module manager
export { moduleManager };

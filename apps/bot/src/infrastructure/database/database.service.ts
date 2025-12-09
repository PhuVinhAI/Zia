/**
 * Database Service - Wrapper service cho database operations
 * Cung cấp interface thống nhất cho các module sử dụng
 */

import { CONFIG } from '../../core/config/config.js';
import { debugLog } from '../../core/logger/logger.js';
import { closeDatabase, initDatabase } from './connection.js';
import { historyRepository } from './repositories/history.repository.js';
import { sentMessagesRepository } from './repositories/sent-messages.repository.js';
import { usersRepository } from './repositories/users.repository.js';

// Cleanup interval từ config
const getCleanupIntervalMs = () => CONFIG.database?.cleanupIntervalMs ?? 3600000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Database Service - Singleton
 */
export class DatabaseService {
  private initialized = false;

  /**
   * Khởi tạo database và bắt đầu cleanup job
   */
  init(): void {
    if (this.initialized) return;

    initDatabase();
    this.startCleanupJob();
    this.initialized = true;

    debugLog('DB_SERVICE', 'Database service initialized');
  }

  /**
   * Đóng database connection
   */
  close(): void {
    this.stopCleanupJob();
    closeDatabase();
    this.initialized = false;
    debugLog('DB_SERVICE', 'Database service closed');
  }

  /**
   * Bắt đầu cleanup job định kỳ
   */
  private startCleanupJob(): void {
    if (cleanupTimer) return;

    cleanupTimer = setInterval(async () => {
      try {
        const deleted = await sentMessagesRepository.cleanup();
        if (deleted > 0) {
          debugLog('DB_SERVICE', `Cleanup job: removed ${deleted} old sent messages`);
        }
      } catch (error) {
        debugLog('DB_SERVICE', `Cleanup job error: ${error}`);
      }
    }, getCleanupIntervalMs());

    debugLog('DB_SERVICE', `Cleanup job started (interval: ${getCleanupIntervalMs() / 1000}s)`);
  }

  /**
   * Dừng cleanup job
   */
  private stopCleanupJob(): void {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
      debugLog('DB_SERVICE', 'Cleanup job stopped');
    }
  }

  // ============================================
  // History Operations
  // ============================================

  get history() {
    return historyRepository;
  }

  // ============================================
  // Sent Messages Operations
  // ============================================

  get sentMessages() {
    return sentMessagesRepository;
  }

  // ============================================
  // Users Operations
  // ============================================

  get users() {
    return usersRepository;
  }
}

// Singleton instance
export const databaseService = new DatabaseService();

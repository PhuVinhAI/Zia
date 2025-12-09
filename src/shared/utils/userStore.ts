/**
 * User Store - Quản lý người dùng với database
 * Wrapper cho usersRepository với caching
 */

import { CONFIG } from '../../core/config/config.js';
import { debugLog } from '../../core/logger/logger.js';
import { type UserRole, usersRepository } from '../../infrastructure/database/index.js';

// Cache để tránh query DB liên tục
const roleCache = new Map<string, UserRole>();
const getCacheTtl = () => CONFIG.userStore?.cacheTtlMs ?? 300000; // 5 phút default
const cacheTimestamps = new Map<string, number>();

/**
 * Lấy role của user (có cache)
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  // Check cache
  const cached = roleCache.get(userId);
  const cacheTime = cacheTimestamps.get(userId) || 0;

  if (cached && Date.now() - cacheTime < getCacheTtl()) {
    return cached;
  }

  // Query DB
  const user = await usersRepository.getUser(userId);
  if (user) {
    roleCache.set(userId, user.role as UserRole);
    cacheTimestamps.set(userId, Date.now());
    return user.role as UserRole;
  }

  return null;
}

/**
 * Kiểm tra user có phải admin không
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Kiểm tra user có bị block không
 */
export async function isBlocked(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'blocked';
}

/**
 * Block user
 */
export async function blockUser(userId: string, name?: string): Promise<void> {
  await usersRepository.upsertUser(userId, { name, role: 'blocked' });
  roleCache.set(userId, 'blocked');
  cacheTimestamps.set(userId, Date.now());
  debugLog('USER_STORE', `Blocked user: ${userId}`);
}

/**
 * Unblock user
 */
export async function unblockUser(userId: string): Promise<void> {
  await usersRepository.upsertUser(userId, { role: 'user' });
  roleCache.set(userId, 'user');
  cacheTimestamps.set(userId, Date.now());
  debugLog('USER_STORE', `Unblocked user: ${userId}`);
}

/**
 * Set admin
 */
export async function setAdmin(userId: string, name?: string): Promise<void> {
  await usersRepository.upsertUser(userId, { name, role: 'admin' });
  roleCache.set(userId, 'admin');
  cacheTimestamps.set(userId, Date.now());
  debugLog('USER_STORE', `Set admin: ${userId}`);
}

/**
 * Đăng ký user mới (nếu chưa tồn tại)
 */
export async function registerUser(userId: string, name?: string): Promise<void> {
  const existing = await usersRepository.getUser(userId);
  if (!existing) {
    await usersRepository.upsertUser(userId, { name, role: 'user' });
    debugLog('USER_STORE', `Registered new user: ${userId} (${name})`);
  }
}

/**
 * Lấy danh sách admins
 */
export async function getAdmins(): Promise<Array<{ userId: string; name: string | null }>> {
  const admins = await usersRepository.getAdmins();
  return admins.map((u) => ({ userId: u.userId, name: u.name }));
}

/**
 * Lấy danh sách blocked users
 */
export async function getBlockedUsers(): Promise<Array<{ userId: string; name: string | null }>> {
  const blocked = await usersRepository.getBlockedUsers();
  return blocked.map((u) => ({ userId: u.userId, name: u.name }));
}

/**
 * Clear cache
 */
export function clearCache(): void {
  roleCache.clear();
  cacheTimestamps.clear();
}

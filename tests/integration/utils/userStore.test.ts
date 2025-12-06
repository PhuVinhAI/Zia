/**
 * Test: User Store
 */
import { describe, expect, it, beforeAll } from 'bun:test';
import { initDatabase } from '../../../src/infrastructure/database/connection.js';
import {
  getUserRole,
  isAdmin,
  isBlocked,
  blockUser,
  unblockUser,
  setAdmin,
  registerUser,
  getAdmins,
  getBlockedUsers,
  clearCache,
} from '../../../src/shared/utils/userStore.js';

// Initialize database before tests
beforeAll(async () => {
  await initDatabase();
});

describe('User Store', () => {
  const testUserId = `userstore-test-${Date.now()}`;

  beforeAll(() => {
    clearCache();
  });

  describe('registerUser()', () => {
    it('should register new user', async () => {
      await registerUser(testUserId, 'Test User');
      const role = await getUserRole(testUserId);
      expect(role).toBe('user');
    });

    it('should not overwrite existing user', async () => {
      await setAdmin(testUserId);
      await registerUser(testUserId, 'New Name');
      const role = await getUserRole(testUserId);
      expect(role).toBe('admin'); // Should still be admin
    });
  });

  describe('getUserRole()', () => {
    it('should return null for non-existent user', async () => {
      const role = await getUserRole('non-existent-user-12345');
      expect(role).toBeNull();
    });

    it('should return role for existing user', async () => {
      const role = await getUserRole(testUserId);
      expect(role).not.toBeNull();
    });

    it('should use cache on second call', async () => {
      // First call
      await getUserRole(testUserId);
      // Second call should use cache (no way to verify directly, but should not error)
      const role = await getUserRole(testUserId);
      expect(role).not.toBeNull();
    });
  });

  describe('isAdmin()', () => {
    it('should return true for admin', async () => {
      await setAdmin(testUserId);
      const result = await isAdmin(testUserId);
      expect(result).toBe(true);
    });

    it('should return false for non-admin', async () => {
      await unblockUser(testUserId); // Reset to user
      const result = await isAdmin(testUserId);
      expect(result).toBe(false);
    });
  });

  describe('isBlocked()', () => {
    it('should return true for blocked user', async () => {
      await blockUser(testUserId);
      const result = await isBlocked(testUserId);
      expect(result).toBe(true);
    });

    it('should return false for non-blocked user', async () => {
      await unblockUser(testUserId);
      const result = await isBlocked(testUserId);
      expect(result).toBe(false);
    });
  });

  describe('blockUser()', () => {
    it('should block user', async () => {
      await blockUser(testUserId, 'Blocked User');
      const role = await getUserRole(testUserId);
      expect(role).toBe('blocked');
    });
  });

  describe('unblockUser()', () => {
    it('should unblock user', async () => {
      await blockUser(testUserId);
      await unblockUser(testUserId);
      const role = await getUserRole(testUserId);
      expect(role).toBe('user');
    });
  });

  describe('setAdmin()', () => {
    it('should set user as admin', async () => {
      await setAdmin(testUserId, 'Admin User');
      const role = await getUserRole(testUserId);
      expect(role).toBe('admin');
    });
  });

  describe('getAdmins()', () => {
    it('should return array of admins', async () => {
      await setAdmin(testUserId);
      const admins = await getAdmins();
      expect(Array.isArray(admins)).toBe(true);
      expect(admins.some(a => a.userId === testUserId)).toBe(true);
    });
  });

  describe('getBlockedUsers()', () => {
    it('should return array of blocked users', async () => {
      const blockedId = `blocked-${Date.now()}`;
      await blockUser(blockedId, 'Blocked');
      
      const blocked = await getBlockedUsers();
      expect(Array.isArray(blocked)).toBe(true);
      expect(blocked.some(u => u.userId === blockedId)).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('should clear cache without error', () => {
      clearCache();
      // No error means success
      expect(true).toBe(true);
    });
  });
});

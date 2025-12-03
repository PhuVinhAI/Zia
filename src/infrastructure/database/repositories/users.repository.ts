/**
 * Users Repository - Quản lý người dùng
 * Hỗ trợ whitelist, blacklist, phân quyền
 */
import { eq } from 'drizzle-orm';
import { debugLog } from '../../../core/logger/logger.js';
import { getDatabase } from '../connection.js';
import { type User, users } from '../schema.js';

export type UserRole = 'admin' | 'user' | 'blocked';

export class UsersRepository {
  private get db() {
    return getDatabase();
  }

  /**
   * Tạo hoặc cập nhật user
   */
  async upsertUser(userId: string, data: { name?: string; role?: UserRole }): Promise<User> {
    const existing = await this.getUser(userId);

    if (existing) {
      // Update
      await this.db
        .update(users)
        .set({
          name: data.name ?? existing.name,
          role: data.role ?? existing.role,
        })
        .where(eq(users.userId, userId));

      return (await this.getUser(userId))!;
    }

    // Insert
    await this.db.insert(users).values({
      userId,
      name: data.name || null,
      role: data.role || 'user',
      createdAt: new Date(),
    });

    debugLog('USERS', `Created user ${userId}`);
    return (await this.getUser(userId))!;
  }

  /**
   * Lấy thông tin user
   */
  async getUser(userId: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.userId, userId)).limit(1);

    return result[0] || null;
  }

  /**
   * Kiểm tra user có phải admin không
   */
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.role === 'admin';
  }

  /**
   * Kiểm tra user có bị block không
   */
  async isBlocked(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.role === 'blocked';
  }

  /**
   * Block user
   */
  async blockUser(userId: string): Promise<void> {
    await this.upsertUser(userId, { role: 'blocked' });
    debugLog('USERS', `Blocked user ${userId}`);
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<void> {
    await this.upsertUser(userId, { role: 'user' });
    debugLog('USERS', `Unblocked user ${userId}`);
  }

  /**
   * Set admin
   */
  async setAdmin(userId: string): Promise<void> {
    await this.upsertUser(userId, { role: 'admin' });
    debugLog('USERS', `Set admin for ${userId}`);
  }

  /**
   * Lấy danh sách users theo role
   */
  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.role, role));
  }

  /**
   * Lấy tất cả admins
   */
  async getAdmins(): Promise<User[]> {
    return this.getUsersByRole('admin');
  }

  /**
   * Lấy tất cả blocked users
   */
  async getBlockedUsers(): Promise<User[]> {
    return this.getUsersByRole('blocked');
  }

  /**
   * Xóa user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.userId, userId)).returning();

    return result.length > 0;
  }
}

// Singleton instance
export const usersRepository = new UsersRepository();

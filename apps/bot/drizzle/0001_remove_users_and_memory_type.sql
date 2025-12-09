-- Migration: Remove users table and type column from memories
-- Note: SQLite không hỗ trợ DROP COLUMN trực tiếp, cần recreate table

-- 1. Drop users table
DROP TABLE IF EXISTS `users`;

-- 2. Drop index on memories.type
DROP INDEX IF EXISTS `idx_memories_type`;

-- 3. Recreate memories table without type column
CREATE TABLE `memories_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`user_id` text,
	`user_name` text,
	`importance` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`last_accessed_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`metadata` text
);

-- 4. Copy data from old table (excluding type column)
INSERT INTO `memories_new` (`id`, `content`, `user_id`, `user_name`, `importance`, `created_at`, `last_accessed_at`, `access_count`, `metadata`)
SELECT `id`, `content`, `user_id`, `user_name`, `importance`, `created_at`, `last_accessed_at`, `access_count`, `metadata`
FROM `memories`;

-- 5. Drop old table
DROP TABLE `memories`;

-- 6. Rename new table
ALTER TABLE `memories_new` RENAME TO `memories`;

-- 7. Recreate index on user_id
CREATE INDEX `idx_memories_user` ON `memories` (`user_id`);

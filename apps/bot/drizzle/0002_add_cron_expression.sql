-- Migration: Add cron_expression column to agent_tasks
-- Cho phép task lặp lại theo lịch cron

-- 1. Add cron_expression column
ALTER TABLE `agent_tasks` ADD COLUMN `cron_expression` text;

-- 2. Create index on cron_expression for faster queries
CREATE INDEX `idx_tasks_cron` ON `agent_tasks` (`cron_expression`);

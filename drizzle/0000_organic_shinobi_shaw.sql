CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_thread` ON `history` (`thread_id`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'note' NOT NULL,
	`user_id` text,
	`user_name` text,
	`importance` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`last_accessed_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `idx_memories_type` ON `memories` (`type`);--> statement-breakpoint
CREATE INDEX `idx_memories_user` ON `memories` (`user_id`);--> statement-breakpoint
CREATE TABLE `sent_messages` (
	`msg_id` text PRIMARY KEY NOT NULL,
	`cli_msg_id` text,
	`thread_id` text NOT NULL,
	`content` text,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sent_thread` ON `sent_messages` (`thread_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL
);

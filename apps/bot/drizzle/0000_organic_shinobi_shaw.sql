CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_thread` ON `history` (`thread_id`);--> statement-breakpoint
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

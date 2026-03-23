CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_sessions_workspace_id_idx` ON `chat_sessions` (`workspace_id`);
--> statement-breakpoint
CREATE INDEX `chat_sessions_last_active_at_idx` ON `chat_sessions` (`last_active_at`);

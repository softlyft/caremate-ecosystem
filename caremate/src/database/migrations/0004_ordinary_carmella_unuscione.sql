CREATE TABLE `article_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'reading' NOT NULL,
	`opened_at` text NOT NULL,
	`read_at` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

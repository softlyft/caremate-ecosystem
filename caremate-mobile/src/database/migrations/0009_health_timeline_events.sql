CREATE TABLE `health_timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`app_key` text NOT NULL,
	`kind` text NOT NULL,
	`occurred_on` text NOT NULL,
	`occurred_at` text,
	`title` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

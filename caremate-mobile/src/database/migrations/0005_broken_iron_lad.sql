CREATE TABLE `analytics_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`properties` text DEFAULT '{}' NOT NULL,
	`distinct_id` text,
	`occurred_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

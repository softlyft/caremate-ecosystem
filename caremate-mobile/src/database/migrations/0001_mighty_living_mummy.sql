CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`domain` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`data_json` text DEFAULT '{}' NOT NULL,
	`dedupe_key` text,
	`read_at` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `user_location_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`altitude` real,
	`accuracy` real,
	`altitude_accuracy` real,
	`heading` real,
	`speed` real,
	`mocked` integer,
	`captured_at` text NOT NULL,
	`source` text DEFAULT 'gps' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

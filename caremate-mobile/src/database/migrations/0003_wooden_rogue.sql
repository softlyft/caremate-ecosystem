CREATE TABLE `ad_advertisers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`org_type` text DEFAULT 'other' NOT NULL,
	`website_url` text,
	`logo_url` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_at` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ad_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event_type` text NOT NULL,
	`campaign_id` text,
	`creative_id` text,
	`slot_id` text NOT NULL,
	`source` text DEFAULT 'house' NOT NULL,
	`ad_unit_id` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_ad_events`("id", "user_id", "event_type", "campaign_id", "creative_id", "slot_id", "source", "ad_unit_id", "sync_status", "deleted_at", "created_at", "updated_at") SELECT "id", "user_id", "event_type", "campaign_id", "creative_id", "slot_id", "source", "ad_unit_id", "sync_status", "deleted_at", "created_at", "updated_at" FROM `ad_events`;--> statement-breakpoint
DROP TABLE `ad_events`;--> statement-breakpoint
ALTER TABLE `__new_ad_events` RENAME TO `ad_events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `ad_campaigns` ADD `advertiser_id` text;
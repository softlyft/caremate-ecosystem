CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text NOT NULL,
	`content_type` text DEFAULT 'article' NOT NULL,
	`category_id` text NOT NULL,
	`category_name` text NOT NULL,
	`image_url` text,
	`source_url` text,
	`published_at` text,
	`attributes` text DEFAULT '{}' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`user_id` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `emergency_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`full_name` text NOT NULL,
	`photo_url` text,
	`blood_group` text,
	`genotype` text,
	`allergies` text DEFAULT '[]' NOT NULL,
	`current_medications` text DEFAULT '[]' NOT NULL,
	`chronic_conditions` text DEFAULT '[]' NOT NULL,
	`emergency_contacts` text DEFAULT '[]' NOT NULL,
	`preferred_hospital` text,
	`insurance_provider` text,
	`notes` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_connection_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`to_user_id` text,
	`to_email` text,
	`to_phone` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`invite_token` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_households` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text NOT NULL,
	`name` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`kind` text NOT NULL,
	`linked_user_id` text,
	`full_name` text NOT NULL,
	`date_of_birth` text,
	`gender` text,
	`notes` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_tips` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`body` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mini_app_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`app_key` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`date_of_birth` text,
	`avatar_url` text,
	`country_code` text,
	`language_code` text,
	`state` text,
	`patient_id` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`latitude` real,
	`longitude` real,
	`is_favorite` integer DEFAULT false NOT NULL,
	`distance_km` real,
	`attributes` text DEFAULT '{}' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`subscribed_category_ids` text DEFAULT '[]' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscription_entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`household_id` text,
	`plan_type` text NOT NULL,
	`billing_interval` text NOT NULL,
	`currency` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`current_period_end` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

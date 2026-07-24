ALTER TABLE `profiles` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `address_line` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `city` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `postal_code` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `national_id` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `marital_status` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_health_practitioner` integer DEFAULT false NOT NULL;
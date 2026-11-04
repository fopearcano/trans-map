CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comparison_events` (
	`comparison_id` text NOT NULL,
	`event_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`comparison_id`, `event_id`),
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comparison_sources` (
	`comparison_id` text NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`comparison_id`, `source_id`),
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`notes_json` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `editorial_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`status` text NOT NULL,
	`actor` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_categories` (
	`event_id` text NOT NULL,
	`category_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`event_id`, `category_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_categories_cat_idx` ON `event_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `event_locations` (
	`event_id` text NOT NULL,
	`place_id` text NOT NULL,
	`role` text NOT NULL,
	`note` text,
	`position` integer NOT NULL,
	PRIMARY KEY(`event_id`, `place_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_sources` (
	`event_id` text NOT NULL,
	`source_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`event_id`, `source_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_statements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`subtype` text,
	`scale` text,
	`duration` text,
	`held_by` text,
	`text` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_statements_event_idx` ON `event_statements` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_tags` (
	`event_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`event_id`, `tag_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_translations` (
	`event_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`detailed_description` text,
	`context` text,
	PRIMARY KEY(`event_id`, `locale`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`origin` text DEFAULT 'curated' NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`detailed_description` text NOT NULL,
	`context` text NOT NULL,
	`start_year` integer NOT NULL,
	`start_month` integer,
	`start_day` integer,
	`end_year` integer,
	`end_month` integer,
	`end_day` integer,
	`ongoing` integer DEFAULT false NOT NULL,
	`date_precision` text NOT NULL,
	`date_circa` integer DEFAULT false NOT NULL,
	`date_note` text,
	`start_value` real NOT NULL,
	`end_value` real NOT NULL,
	`location_note` text,
	`people_affected_json` text DEFAULT '[]' NOT NULL,
	`causes_json` text DEFAULT '[]' NOT NULL,
	`known_gaps_json` text DEFAULT '[]' NOT NULL,
	`evidence_status` text NOT NULL,
	`last_verified_at` text NOT NULL,
	`wikidata_id` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_time_idx` ON `events` (`start_value`,`end_value`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`evidence_status`);--> statement-breakpoint
CREATE TABLE `footprints` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`country_codes_json` text DEFAULT '[]' NOT NULL,
	`approximation` text NOT NULL,
	`source_ids_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metric_denominators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`year` integer NOT NULL,
	`description` text NOT NULL,
	`source_ids_json` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `metric_sources` (
	`metric_id` text NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`metric_id`, `source_id`),
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`metric_type` text NOT NULL,
	`value` real,
	`min_estimate` real,
	`max_estimate` real,
	`unit` text NOT NULL,
	`estimate_kind` text NOT NULL,
	`attributed_to` text NOT NULL,
	`scope` text,
	`measurement_period` text,
	`methodology` text,
	`uncertainty` text NOT NULL,
	`is_reference` integer DEFAULT false NOT NULL,
	`documented_zero` integer DEFAULT false NOT NULL,
	`note` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metrics_type_idx` ON `metrics` (`metric_type`);--> statement-breakpoint
CREATE INDEX `metrics_event_idx` ON `metrics` (`event_id`);--> statement-breakpoint
CREATE TABLE `place_sources` (
	`place_id` text NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`place_id`, `source_id`),
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lat` real,
	`lon` real,
	`precision` text NOT NULL,
	`subregion` text NOT NULL,
	`country_codes_json` text DEFAULT '[]' NOT NULL,
	`wikidata_id` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `relation_sources` (
	`relation_id` text NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`relation_id`, `source_id`),
	FOREIGN KEY (`relation_id`) REFERENCES `relations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_event_id` text NOT NULL,
	`to_event_id` text NOT NULL,
	`type` text NOT NULL,
	`basis` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`from_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `relations_from_idx` ON `relations` (`from_event_id`);--> statement-breakpoint
CREATE INDEX `relations_to_idx` ON `relations` (`to_event_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`authors_json` text,
	`publisher` text,
	`year` integer,
	`url` text,
	`doi` text,
	`accessed_at` text,
	`reliability` text NOT NULL,
	`license` text,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `statement_sources` (
	`statement_id` integer NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`statement_id`, `source_id`),
	FOREIGN KEY (`statement_id`) REFERENCES `event_statements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL
);

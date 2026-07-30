CREATE TABLE `data_quality_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`flag` text NOT NULL,
	`severity` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`license` text,
	`attribution_required` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`blocked_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `nutrition_facts` (
	`product_id` text PRIMARY KEY NOT NULL,
	`basis` text NOT NULL,
	`energy_kcal` real,
	`fat` real,
	`saturated_fat` real,
	`carbohydrates` real,
	`sugar` real,
	`fiber` real,
	`protein` real,
	`salt` real,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`score` real,
	`grade` text NOT NULL,
	`confidence` text NOT NULL,
	`positives_json` text NOT NULL,
	`negatives_json` text NOT NULL,
	`missing_data_json` text NOT NULL,
	`rule_version` text NOT NULL,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`gtin` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`category_slug` text NOT NULL,
	`image_url` text,
	`source_id` text,
	`imported_at` text NOT NULL,
	`source_updated_at` text,
	`publishability` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_gtin_unique` ON `products` (`gtin`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE TABLE `ranking_items` (
	`id` text PRIMARY KEY NOT NULL,
	`ranking_page_id` text NOT NULL,
	`product_id` text NOT NULL,
	`position` integer NOT NULL,
	`score_snapshot` real,
	FOREIGN KEY (`ranking_page_id`) REFERENCES `ranking_pages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ranking_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`attribute` text NOT NULL,
	`category_slug` text NOT NULL,
	`title` text NOT NULL,
	`intro` text NOT NULL,
	`sort_score` text NOT NULL,
	`indexable` integer DEFAULT false NOT NULL,
	`min_products_required` integer DEFAULT 20 NOT NULL
);

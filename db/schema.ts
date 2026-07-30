import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dataSources = sqliteTable("data_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  license: text("license"),
  attributionRequired: integer("attribution_required", { mode: "boolean" }).notNull().default(true),
});

export const importRuns = sqliteTable("import_runs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").references(() => dataSources.id),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  importedCount: integer("imported_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  blockedCount: integer("blocked_count").notNull().default(0),
  status: text("status").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  gtin: text("gtin").notNull().unique(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand"),
  categorySlug: text("category_slug").notNull(),
  imageUrl: text("image_url"),
  sourceId: text("source_id").references(() => dataSources.id),
  importedAt: text("imported_at").notNull(),
  sourceUpdatedAt: text("source_updated_at"),
  publishability: text("publishability").notNull().default("draft"),
});

export const nutritionFacts = sqliteTable("nutrition_facts", {
  productId: text("product_id").primaryKey().references(() => products.id),
  basis: text("basis").notNull(),
  energyKcal: real("energy_kcal"),
  fat: real("fat"),
  saturatedFat: real("saturated_fat"),
  carbohydrates: real("carbohydrates"),
  sugar: real("sugar"),
  fiber: real("fiber"),
  protein: real("protein"),
  salt: real("salt"),
});

export const productScores = sqliteTable("product_scores", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  type: text("type").notNull(),
  label: text("label").notNull(),
  score: real("score"),
  grade: text("grade").notNull(),
  confidence: text("confidence").notNull(),
  positivesJson: text("positives_json").notNull(),
  negativesJson: text("negatives_json").notNull(),
  missingDataJson: text("missing_data_json").notNull(),
  ruleVersion: text("rule_version").notNull(),
  calculatedAt: text("calculated_at").notNull(),
});

export const dataQualityFlags = sqliteTable("data_quality_flags", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  flag: text("flag").notNull(),
  severity: text("severity").notNull(),
  createdAt: text("created_at").notNull(),
});

export const rankingPages = sqliteTable("ranking_pages", {
  id: text("id").primaryKey(),
  attribute: text("attribute").notNull(),
  categorySlug: text("category_slug").notNull(),
  title: text("title").notNull(),
  intro: text("intro").notNull(),
  sortScore: text("sort_score").notNull(),
  indexable: integer("indexable", { mode: "boolean" }).notNull().default(false),
  minProductsRequired: integer("min_products_required").notNull().default(20),
});

export const rankingItems = sqliteTable("ranking_items", {
  id: text("id").primaryKey(),
  rankingPageId: text("ranking_page_id").notNull().references(() => rankingPages.id),
  productId: text("product_id").notNull().references(() => products.id),
  position: integer("position").notNull(),
  scoreSnapshot: real("score_snapshot"),
});

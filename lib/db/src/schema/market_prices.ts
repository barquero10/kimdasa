import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priceRegionEnum = pgEnum("price_region", [
  "new_jersey",
  "pennsylvania",
]);

export const priceTypeEnum = pgEnum("price_type", [
  "installed",
  "material",
  "labor",
]);

export const marketPricesTable = pgTable("market_prices", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  region: priceRegionEnum("region").notNull().default("new_jersey"),
  priceType: priceTypeEnum("price_type").notNull().default("installed"),
  unit: text("unit").notNull().default("per sq ft"),
  minPrice: numeric("min_price", { precision: 10, scale: 2 }),
  avgPrice: numeric("avg_price", { precision: 10, scale: 2 }),
  premiumPrice: numeric("premium_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  source: text("source"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMarketPriceSchema = createInsertSchema(marketPricesTable).omit({
  id: true,
  createdAt: true,
});
export const selectMarketPriceSchema = createSelectSchema(marketPricesTable);
export type InsertMarketPrice = z.infer<typeof insertMarketPriceSchema>;
export type MarketPrice = typeof marketPricesTable.$inferSelect;

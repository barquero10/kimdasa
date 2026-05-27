import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";

export const estimateStatusEnum = pgEnum("estimate_status", [
  "draft",
  "sent",
  "approved",
  "rejected",
]);

export const regionEnum = pgEnum("region", ["new_jersey", "pennsylvania"]);

export const estimatesTable = pgTable("estimates", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  serviceType: text("service_type").notNull(),
  measurements: text("measurements"),
  difficulty: text("difficulty").default("medium"),
  height: text("height"),
  roofPitch: text("roof_pitch"),
  materials: text("materials"),
  region: regionEnum("region").default("new_jersey"),
  laborCost: numeric("labor_cost", { precision: 10, scale: 2 }),
  materialCost: numeric("material_cost", { precision: 10, scale: 2 }),
  overhead: numeric("overhead", { precision: 10, scale: 2 }),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }),
  internalCost: numeric("internal_cost", { precision: 10, scale: 2 }),
  recommendedPrice: numeric("recommended_price", { precision: 10, scale: 2 }),
  clientPrice: numeric("client_price", { precision: 10, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }),
  status: estimateStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEstimateSchema = createInsertSchema(estimatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectEstimateSchema = createSelectSchema(estimatesTable);
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimatesTable.$inferSelect;

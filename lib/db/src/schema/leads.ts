import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadStatusEnum = pgEnum("lead_status", [
  "new_lead",
  "contacted",
  "estimate_sent",
  "approved",
  "in_progress",
  "completed",
  "lost",
]);

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  serviceType: text("service_type"),
  urgency: text("urgency"),
  budgetApprox: text("budget_approx"),
  bestContactTime: text("best_contact_time"),
  comments: text("comments"),
  status: leadStatusEnum("status").notNull().default("new_lead"),
  language: text("language").notNull().default("en"),
  source: text("source").default("website"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectLeadSchema = createSelectSchema(leadsTable);
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

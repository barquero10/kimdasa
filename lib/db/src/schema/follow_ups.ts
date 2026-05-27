import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";

export const followUpsTable = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFollowUpSchema = createInsertSchema(followUpsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFollowUpSchema = createSelectSchema(followUpsTable);
export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUpsTable.$inferSelect;

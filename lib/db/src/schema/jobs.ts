import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { estimatesTable } from "./estimates";

export const jobStatusEnum = pgEnum("job_status", [
  "scheduled",
  "in_progress",
  "completed",
  "on_hold",
  "cancelled",
]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customersTable.id),
  estimateId: integer("estimate_id").references(() => estimatesTable.id),
  title: text("title").notNull(),
  serviceType: text("service_type"),
  status: jobStatusEnum("status").notNull().default("scheduled"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  crewNotes: text("crew_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectJobSchema = createSelectSchema(jobsTable);
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

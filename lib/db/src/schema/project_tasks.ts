import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";
import { jobsTable } from "./jobs";

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
]);

export const projectTasksTable = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectTaskSchema = createInsertSchema(projectTasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectProjectTaskSchema = createSelectSchema(projectTasksTable);
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasksTable.$inferSelect;

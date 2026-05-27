import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";
import { jobsTable } from "./jobs";

export const aiNotesTable = pgTable("ai_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  agentType: text("agent_type").notNull().default("admin"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAiNoteSchema = createInsertSchema(aiNotesTable).omit({
  id: true,
  createdAt: true,
});
export const selectAiNoteSchema = createSelectSchema(aiNotesTable);
export type InsertAiNote = z.infer<typeof insertAiNoteSchema>;
export type AiNote = typeof aiNotesTable.$inferSelect;

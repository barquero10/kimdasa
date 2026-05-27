import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const agentTypeEnum = pgEnum("agent_type", [
  "seller",
  "sales",
  "estimator",
  "project_manager",
  "admin",
  "marketing",
]);

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  agentType: agentTypeEnum("agent_type").notNull().default("seller"),
  language: text("language").notNull().default("en"),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
});
export const selectConversationSchema = createSelectSchema(conversationsTable);
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

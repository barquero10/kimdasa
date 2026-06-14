import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const virtualAgentsTable = pgTable("virtual_agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  agentType: text("agent_type").notNull(),
  systemPrompt: text("system_prompt"),
  language: text("language").notNull().default("en"),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVirtualAgentSchema = createInsertSchema(virtualAgentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectVirtualAgentSchema = createSelectSchema(virtualAgentsTable);
export type InsertVirtualAgent = z.infer<typeof insertVirtualAgentSchema>;
export type VirtualAgent = typeof virtualAgentsTable.$inferSelect;

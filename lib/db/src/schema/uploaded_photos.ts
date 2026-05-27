import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { customersTable } from "./customers";
import { jobsTable } from "./jobs";

export const uploadedPhotosTable = pgTable("uploaded_photos", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leadsTable.id),
  customerId: integer("customer_id").references(() => customersTable.id),
  jobId: integer("job_id").references(() => jobsTable.id),
  filename: text("filename").notNull(),
  url: text("url"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUploadedPhotoSchema = createInsertSchema(uploadedPhotosTable).omit({
  id: true,
  createdAt: true,
});
export const selectUploadedPhotoSchema = createSelectSchema(uploadedPhotosTable);
export type InsertUploadedPhoto = z.infer<typeof insertUploadedPhotoSchema>;
export type UploadedPhoto = typeof uploadedPhotosTable.$inferSelect;

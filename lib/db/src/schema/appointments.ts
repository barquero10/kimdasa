import { pgTable, serial, text, timestamp, pgEnum, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  service: text("service").notNull(),
  preferredDate: text("preferred_date").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  address: text("address"),
  estimateLow: numeric("estimate_low"),
  estimateHigh: numeric("estimate_high"),
  language: text("language").notNull().default("en"),
  leadId: integer("lead_id"),
  reminderSent: text("reminder_sent"),
  confirmationSent: text("confirmation_sent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectAppointmentSchema = createSelectSchema(appointmentsTable);
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;

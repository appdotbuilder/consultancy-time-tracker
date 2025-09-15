import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['consultant', 'project_manager', 'administrator']),
  hourly_rate: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['consultant', 'project_manager', 'administrator']),
  hourly_rate: z.number().positive().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Client schema
export const clientSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  industry: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Client = z.infer<typeof clientSchema>;

export const createClientInputSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  industry: z.string().nullable()
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

// Contact schema
export const contactSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Contact = z.infer<typeof contactSchema>;

export const createContactInputSchema = z.object({
  client_id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable()
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  budget: z.number().nullable(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']),
  start_date: z.coerce.date().nullable(),
  end_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  client_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  budget: z.number().positive().nullable(),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
  start_date: z.coerce.date().nullable(),
  end_date: z.coerce.date().nullable()
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// Position schema
export const positionSchema = z.object({
  id: z.number(),
  project_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  budget: z.number().nullable(),
  hourly_rate: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Position = z.infer<typeof positionSchema>;

export const createPositionInputSchema = z.object({
  project_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  budget: z.number().positive().nullable(),
  hourly_rate: z.number().positive().nullable()
});

export type CreatePositionInput = z.infer<typeof createPositionInputSchema>;

// Time entry schema
export const timeEntrySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  position_id: z.number(),
  description: z.string().nullable(),
  hours: z.number(),
  date: z.coerce.date(),
  billable: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;

export const createTimeEntryInputSchema = z.object({
  user_id: z.number(),
  position_id: z.number(),
  description: z.string().nullable(),
  hours: z.number().positive(),
  date: z.coerce.date(),
  billable: z.boolean().default(true)
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntryInputSchema>;

// Client notes schema
export const clientNoteSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  user_id: z.number(),
  note: z.string(),
  created_at: z.coerce.date()
});

export type ClientNote = z.infer<typeof clientNoteSchema>;

export const createClientNoteInputSchema = z.object({
  client_id: z.number(),
  user_id: z.number(),
  note: z.string()
});

export type CreateClientNoteInput = z.infer<typeof createClientNoteInputSchema>;

// Activity log schema
export const activityLogSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  user_id: z.number(),
  activity_type: z.enum(['call', 'meeting', 'email', 'other']),
  description: z.string(),
  activity_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

export const createActivityLogInputSchema = z.object({
  client_id: z.number(),
  user_id: z.number(),
  activity_type: z.enum(['call', 'meeting', 'email', 'other']),
  description: z.string(),
  activity_date: z.coerce.date()
});

export type CreateActivityLogInput = z.infer<typeof createActivityLogInputSchema>;

// Reporting schemas
export const utilizationReportInputSchema = z.object({
  user_id: z.number().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type UtilizationReportInput = z.infer<typeof utilizationReportInputSchema>;

export const budgetConsumptionInputSchema = z.object({
  client_id: z.number().optional(),
  project_id: z.number().optional(),
  position_id: z.number().optional()
});

export type BudgetConsumptionInput = z.infer<typeof budgetConsumptionInputSchema>;

export const bookingDetailsInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type BookingDetailsInput = z.infer<typeof bookingDetailsInputSchema>;
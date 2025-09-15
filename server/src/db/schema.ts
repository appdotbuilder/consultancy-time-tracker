import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['consultant', 'project_manager', 'administrator']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'completed', 'on_hold', 'cancelled']);
export const activityTypeEnum = pgEnum('activity_type', ['call', 'meeting', 'email', 'other']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  hourly_rate: numeric('hourly_rate', { precision: 10, scale: 2 }), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Clients table
export const clientsTable = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'), // Nullable
  industry: text('industry'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Contacts table
export const contactsTable = pgTable('contacts', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  name: text('name').notNull(),
  email: text('email'), // Nullable
  phone: text('phone'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  budget: numeric('budget', { precision: 15, scale: 2 }), // Nullable
  status: projectStatusEnum('status').notNull().default('active'),
  start_date: date('start_date'), // Nullable
  end_date: date('end_date'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Positions table
export const positionsTable = pgTable('positions', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projectsTable.id),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  budget: numeric('budget', { precision: 15, scale: 2 }), // Nullable
  hourly_rate: numeric('hourly_rate', { precision: 10, scale: 2 }), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Time entries table
export const timeEntriesTable = pgTable('time_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  position_id: integer('position_id').notNull().references(() => positionsTable.id),
  description: text('description'), // Nullable
  hours: numeric('hours', { precision: 8, scale: 2 }).notNull(),
  date: date('date').notNull(),
  billable: boolean('billable').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Client notes table
export const clientNotesTable = pgTable('client_notes', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  note: text('note').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Activity logs table
export const activityLogsTable = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  client_id: integer('client_id').notNull().references(() => clientsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  activity_type: activityTypeEnum('activity_type').notNull(),
  description: text('description').notNull(),
  activity_date: date('activity_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  timeEntries: many(timeEntriesTable),
  clientNotes: many(clientNotesTable),
  activityLogs: many(activityLogsTable),
}));

export const clientsRelations = relations(clientsTable, ({ many }) => ({
  contacts: many(contactsTable),
  projects: many(projectsTable),
  clientNotes: many(clientNotesTable),
  activityLogs: many(activityLogsTable),
}));

export const contactsRelations = relations(contactsTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [contactsTable.client_id],
    references: [clientsTable.id],
  }),
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [projectsTable.client_id],
    references: [clientsTable.id],
  }),
  positions: many(positionsTable),
}));

export const positionsRelations = relations(positionsTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [positionsTable.project_id],
    references: [projectsTable.id],
  }),
  timeEntries: many(timeEntriesTable),
}));

export const timeEntriesRelations = relations(timeEntriesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [timeEntriesTable.user_id],
    references: [usersTable.id],
  }),
  position: one(positionsTable, {
    fields: [timeEntriesTable.position_id],
    references: [positionsTable.id],
  }),
}));

export const clientNotesRelations = relations(clientNotesTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [clientNotesTable.client_id],
    references: [clientsTable.id],
  }),
  user: one(usersTable, {
    fields: [clientNotesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const activityLogsRelations = relations(activityLogsTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [activityLogsTable.client_id],
    references: [clientsTable.id],
  }),
  user: one(usersTable, {
    fields: [activityLogsTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  clients: clientsTable,
  contacts: contactsTable,
  projects: projectsTable,
  positions: positionsTable,
  timeEntries: timeEntriesTable,
  clientNotes: clientNotesTable,
  activityLogs: activityLogsTable,
};

// TypeScript types for the tables
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;

export type Contact = typeof contactsTable.$inferSelect;
export type NewContact = typeof contactsTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;

export type Position = typeof positionsTable.$inferSelect;
export type NewPosition = typeof positionsTable.$inferInsert;

export type TimeEntry = typeof timeEntriesTable.$inferSelect;
export type NewTimeEntry = typeof timeEntriesTable.$inferInsert;

export type ClientNote = typeof clientNotesTable.$inferSelect;
export type NewClientNote = typeof clientNotesTable.$inferInsert;

export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type NewActivityLog = typeof activityLogsTable.$inferInsert;
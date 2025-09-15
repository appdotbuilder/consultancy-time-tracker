import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createClientInputSchema,
  createContactInputSchema,
  createProjectInputSchema,
  createPositionInputSchema,
  createTimeEntryInputSchema,
  createClientNoteInputSchema,
  createActivityLogInputSchema,
  utilizationReportInputSchema,
  budgetConsumptionInputSchema,
  bookingDetailsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createClient } from './handlers/create_client';
import { getClients } from './handlers/get_clients';
import { createContact } from './handlers/create_contact';
import { getContactsByClient } from './handlers/get_contacts_by_client';
import { createProject } from './handlers/create_project';
import { getProjectsByClient } from './handlers/get_projects_by_client';
import { createPosition } from './handlers/create_position';
import { getPositionsByProject } from './handlers/get_positions_by_project';
import { createTimeEntry } from './handlers/create_time_entry';
import { getTimeEntriesByUser } from './handlers/get_time_entries_by_user';
import { createClientNote } from './handlers/create_client_note';
import { getClientNotes } from './handlers/get_client_notes';
import { createActivityLog } from './handlers/create_activity_log';
import { getActivityLogs } from './handlers/get_activity_logs';
import { getUtilizationReport } from './handlers/get_utilization_report';
import { getBudgetConsumption } from './handlers/get_budget_consumption';
import { getBookingDetails } from './handlers/get_booking_details';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .query(() => getUsers()),

  // Client management
  createClient: publicProcedure
    .input(createClientInputSchema)
    .mutation(({ input }) => createClient(input)),
  getClients: publicProcedure
    .query(() => getClients()),

  // Contact management
  createContact: publicProcedure
    .input(createContactInputSchema)
    .mutation(({ input }) => createContact(input)),
  getContactsByClient: publicProcedure
    .input(z.object({ client_id: z.number() }))
    .query(({ input }) => getContactsByClient(input)),

  // Project management
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),
  getProjectsByClient: publicProcedure
    .input(z.object({ client_id: z.number() }))
    .query(({ input }) => getProjectsByClient(input)),

  // Position management
  createPosition: publicProcedure
    .input(createPositionInputSchema)
    .mutation(({ input }) => createPosition(input)),
  getPositionsByProject: publicProcedure
    .input(z.object({ project_id: z.number() }))
    .query(({ input }) => getPositionsByProject(input)),

  // Time tracking
  createTimeEntry: publicProcedure
    .input(createTimeEntryInputSchema)
    .mutation(({ input }) => createTimeEntry(input)),
  getTimeEntriesByUser: publicProcedure
    .input(z.object({
      user_id: z.number(),
      start_date: z.coerce.date().optional(),
      end_date: z.coerce.date().optional()
    }))
    .query(({ input }) => getTimeEntriesByUser(input)),

  // CRM - Client notes
  createClientNote: publicProcedure
    .input(createClientNoteInputSchema)
    .mutation(({ input }) => createClientNote(input)),
  getClientNotes: publicProcedure
    .input(z.object({ client_id: z.number() }))
    .query(({ input }) => getClientNotes(input)),

  // CRM - Activity logs
  createActivityLog: publicProcedure
    .input(createActivityLogInputSchema)
    .mutation(({ input }) => createActivityLog(input)),
  getActivityLogs: publicProcedure
    .input(z.object({ client_id: z.number() }))
    .query(({ input }) => getActivityLogs(input)),

  // Reporting
  getUtilizationReport: publicProcedure
    .input(utilizationReportInputSchema)
    .query(({ input }) => getUtilizationReport(input)),
  getBudgetConsumption: publicProcedure
    .input(budgetConsumptionInputSchema)
    .query(({ input }) => getBudgetConsumption(input)),
  getBookingDetails: publicProcedure
    .input(bookingDetailsInputSchema)
    .query(({ input }) => getBookingDetails(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
import { db } from '../db';
import { timeEntriesTable, positionsTable, projectsTable, clientsTable } from '../db/schema';
import { type BookingDetailsInput } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';

// Booking details response type
export const bookingDetailsSchema = z.object({
    date: z.coerce.date(),
    total_hours: z.number(),
    entries: z.array(z.object({
        time_entry_id: z.number(),
        position_name: z.string(),
        project_name: z.string(),
        client_name: z.string(),
        description: z.string().nullable(),
        hours: z.number(),
        billable: z.boolean()
    }))
});

export type BookingDetails = z.infer<typeof bookingDetailsSchema>;

export const getBookingDetails = async (input: BookingDetailsInput): Promise<BookingDetails[]> => {
    try {
        // Query time entries with full hierarchy information
        const results = await db.select({
            id: timeEntriesTable.id,
            date: timeEntriesTable.date,
            hours: timeEntriesTable.hours,
            description: timeEntriesTable.description,
            billable: timeEntriesTable.billable,
            position_name: positionsTable.name,
            project_name: projectsTable.name,
            client_name: clientsTable.name
        })
        .from(timeEntriesTable)
        .innerJoin(positionsTable, eq(timeEntriesTable.position_id, positionsTable.id))
        .innerJoin(projectsTable, eq(positionsTable.project_id, projectsTable.id))
        .innerJoin(clientsTable, eq(projectsTable.client_id, clientsTable.id))
        .where(and(
            eq(timeEntriesTable.user_id, input.user_id),
            gte(timeEntriesTable.date, input.start_date.toISOString().split('T')[0]),
            lte(timeEntriesTable.date, input.end_date.toISOString().split('T')[0])
        ))
        .orderBy(desc(timeEntriesTable.date))
        .execute();

        // Group entries by date
        const entriesByDate = new Map<string, typeof results>();
        
        for (const entry of results) {
            const dateKey = entry.date;
            if (!entriesByDate.has(dateKey)) {
                entriesByDate.set(dateKey, []);
            }
            entriesByDate.get(dateKey)!.push(entry);
        }

        // Transform grouped data into the required format
        const bookingDetails: BookingDetails[] = [];
        
        for (const [dateString, entries] of entriesByDate) {
            const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
            
            bookingDetails.push({
                date: new Date(dateString),
                total_hours: totalHours,
                entries: entries.map(entry => ({
                    time_entry_id: entry.id,
                    position_name: entry.position_name,
                    project_name: entry.project_name,
                    client_name: entry.client_name,
                    description: entry.description,
                    hours: parseFloat(entry.hours), // Convert numeric field to number
                    billable: entry.billable
                }))
            });
        }

        // Sort by date descending (most recent first)
        bookingDetails.sort((a, b) => b.date.getTime() - a.date.getTime());

        return bookingDetails;
    } catch (error) {
        console.error('Booking details retrieval failed:', error);
        throw error;
    }
};
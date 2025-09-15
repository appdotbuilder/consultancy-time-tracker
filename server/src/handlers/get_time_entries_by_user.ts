import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { type TimeEntry } from '../schema';
import { z } from 'zod';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

const getTimeEntriesByUserInputSchema = z.object({
    user_id: z.number(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional()
});

export const getTimeEntriesByUser = async (input: z.infer<typeof getTimeEntriesByUserInputSchema>): Promise<TimeEntry[]> => {
    try {
        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        // Always filter by user_id
        conditions.push(eq(timeEntriesTable.user_id, input.user_id));

        // Add date filters if provided (convert Date to string for comparison)
        if (input.start_date) {
            const startDateString = input.start_date.toISOString().split('T')[0];
            conditions.push(gte(timeEntriesTable.date, startDateString));
        }

        if (input.end_date) {
            const endDateString = input.end_date.toISOString().split('T')[0];
            conditions.push(lte(timeEntriesTable.date, endDateString));
        }

        // Build and execute the query
        const results = await db.select()
            .from(timeEntriesTable)
            .where(and(...conditions))
            .orderBy(desc(timeEntriesTable.date))
            .execute();

        // Convert numeric fields and date strings to proper types
        return results.map(entry => ({
            ...entry,
            hours: parseFloat(entry.hours),
            date: new Date(entry.date + 'T00:00:00.000Z') // Convert string to Date
        }));

    } catch (error) {
        console.error('Failed to get time entries by user:', error);
        throw error;
    }
};
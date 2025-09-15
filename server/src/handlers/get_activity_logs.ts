import { db } from '../db';
import { activityLogsTable } from '../db/schema';
import { type ActivityLog } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getActivityLogsInputSchema = z.object({
    client_id: z.number()
});

export const getActivityLogs = async (input: z.infer<typeof getActivityLogsInputSchema>): Promise<ActivityLog[]> => {
    try {
        // Query activity logs for the specific client, ordered by activity_date descending (most recent first)
        const results = await db.select()
            .from(activityLogsTable)
            .where(eq(activityLogsTable.client_id, input.client_id))
            .orderBy(activityLogsTable.activity_date)
            .execute();

        // Convert date strings to Date objects to match schema expectations
        return results.map(result => ({
            ...result,
            activity_date: new Date(result.activity_date)
        }));
    } catch (error) {
        console.error('Failed to get activity logs:', error);
        throw error;
    }
};
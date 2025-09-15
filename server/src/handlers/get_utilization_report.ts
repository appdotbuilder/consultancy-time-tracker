import { db } from '../db';
import { usersTable, timeEntriesTable } from '../db/schema';
import { type UtilizationReportInput } from '../schema';
import { eq, and, gte, lte, sum, SQL } from 'drizzle-orm';
import { z } from 'zod';

// Utilization report response type
export const utilizationReportSchema = z.object({
    user_id: z.number(),
    user_name: z.string(),
    total_hours: z.number(),
    billable_hours: z.number(),
    utilization_rate: z.number(), // Percentage
    period_start: z.coerce.date(),
    period_end: z.coerce.date()
});

export type UtilizationReport = z.infer<typeof utilizationReportSchema>;

export const getUtilizationReport = async (input: UtilizationReportInput): Promise<UtilizationReport[]> => {
    try {
        // Convert dates to strings for PostgreSQL date comparison
        const startDateStr = input.start_date.toISOString().split('T')[0];
        const endDateStr = input.end_date.toISOString().split('T')[0];

        // Get users - use two separate queries to avoid TypeScript issues
        const users = input.user_id
            ? await db.select({
                user_id: usersTable.id,
                user_name: usersTable.name
              }).from(usersTable)
              .where(eq(usersTable.id, input.user_id))
              .execute()
            : await db.select({
                user_id: usersTable.id,
                user_name: usersTable.name
              }).from(usersTable)
              .execute();

        const reports: UtilizationReport[] = [];

        // For each user, calculate their utilization
        for (const user of users) {
            // Build conditions for time entries query
            const conditions: SQL<unknown>[] = [
                eq(timeEntriesTable.user_id, user.user_id),
                gte(timeEntriesTable.date, startDateStr),
                lte(timeEntriesTable.date, endDateStr)
            ];

            // Query total hours
            const totalHoursQuery = db.select({
                total: sum(timeEntriesTable.hours)
            })
            .from(timeEntriesTable)
            .where(and(...conditions));

            // Query billable hours
            const billableHoursQuery = db.select({
                billable: sum(timeEntriesTable.hours)
            })
            .from(timeEntriesTable)
            .where(and(...conditions, eq(timeEntriesTable.billable, true)));

            const [totalResult, billableResult] = await Promise.all([
                totalHoursQuery.execute(),
                billableHoursQuery.execute()
            ]);

            // Convert numeric values and handle nulls
            const totalHours = totalResult[0]?.total ? parseFloat(totalResult[0].total) : 0;
            const billableHours = billableResult[0]?.billable ? parseFloat(billableResult[0].billable) : 0;

            // Calculate utilization rate as percentage
            const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

            reports.push({
                user_id: user.user_id,
                user_name: user.user_name,
                total_hours: totalHours,
                billable_hours: billableHours,
                utilization_rate: Math.round(utilizationRate * 100) / 100, // Round to 2 decimal places
                period_start: input.start_date,
                period_end: input.end_date
            });
        }

        return reports;
    } catch (error) {
        console.error('Utilization report generation failed:', error);
        throw error;
    }
};
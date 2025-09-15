import { db } from '../db';
import { positionsTable } from '../db/schema';
import { type Position } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const getPositionsByProjectInputSchema = z.object({
    project_id: z.number()
});

export type GetPositionsByProjectInput = z.infer<typeof getPositionsByProjectInputSchema>;

export const getPositionsByProject = async (input: GetPositionsByProjectInput): Promise<Position[]> => {
    try {
        // Query positions for the specified project
        const results = await db.select()
            .from(positionsTable)
            .where(eq(positionsTable.project_id, input.project_id))
            .execute();

        // Convert numeric fields back to numbers before returning
        return results.map(position => ({
            ...position,
            budget: position.budget ? parseFloat(position.budget) : null,
            hourly_rate: position.hourly_rate ? parseFloat(position.hourly_rate) : null
        }));
    } catch (error) {
        console.error('Failed to fetch positions by project:', error);
        throw error;
    }
};
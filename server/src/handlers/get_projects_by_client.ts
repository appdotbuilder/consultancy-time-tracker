import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type Project } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getProjectsByClientInputSchema = z.object({
    client_id: z.number()
});

export type GetProjectsByClientInput = z.infer<typeof getProjectsByClientInputSchema>;

export const getProjectsByClient = async (input: GetProjectsByClientInput): Promise<Project[]> => {
    try {
        // Fetch all projects for the specified client
        const results = await db.select()
            .from(projectsTable)
            .where(eq(projectsTable.client_id, input.client_id))
            .execute();

        // Convert numeric and date fields to proper types before returning
        return results.map(project => ({
            ...project,
            budget: project.budget ? parseFloat(project.budget) : null,
            start_date: project.start_date ? new Date(project.start_date) : null,
            end_date: project.end_date ? new Date(project.end_date) : null
        }));
    } catch (error) {
        console.error('Failed to fetch projects by client:', error);
        throw error;
    }
};
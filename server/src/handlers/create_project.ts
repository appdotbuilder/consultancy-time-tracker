import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type CreateProjectInput, type Project } from '../schema';

export const createProject = async (input: CreateProjectInput): Promise<Project> => {
  try {
    // Insert project record
    const result = await db.insert(projectsTable)
      .values({
        client_id: input.client_id,
        name: input.name,
        description: input.description,
        budget: input.budget ? input.budget.toString() : null, // Convert number to string for numeric column
        status: input.status, // Zod default ensures this exists
        start_date: input.start_date ? input.start_date.toISOString().split('T')[0] : null, // Convert Date to string
        end_date: input.end_date ? input.end_date.toISOString().split('T')[0] : null // Convert Date to string
      })
      .returning()
      .execute();

    // Convert fields back to expected types before returning
    const project = result[0];
    return {
      ...project,
      budget: project.budget ? parseFloat(project.budget) : null, // Convert string back to number
      start_date: project.start_date ? new Date(project.start_date) : null, // Convert string back to Date
      end_date: project.end_date ? new Date(project.end_date) : null // Convert string back to Date
    };
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
};
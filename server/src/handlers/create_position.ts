import { db } from '../db';
import { positionsTable } from '../db/schema';
import { type CreatePositionInput, type Position } from '../schema';

export const createPosition = async (input: CreatePositionInput): Promise<Position> => {
  try {
    // Insert position record
    const result = await db.insert(positionsTable)
      .values({
        project_id: input.project_id,
        name: input.name,
        description: input.description,
        budget: input.budget !== null ? input.budget.toString() : null, // Convert number to string for numeric column
        hourly_rate: input.hourly_rate !== null ? input.hourly_rate.toString() : null // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const position = result[0];
    return {
      ...position,
      budget: position.budget ? parseFloat(position.budget) : null, // Convert string back to number
      hourly_rate: position.hourly_rate ? parseFloat(position.hourly_rate) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Position creation failed:', error);
    throw error;
  }
};
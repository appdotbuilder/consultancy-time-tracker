import { db } from '../db';
import { timeEntriesTable, usersTable, positionsTable } from '../db/schema';
import { type CreateTimeEntryInput, type TimeEntry } from '../schema';
import { eq } from 'drizzle-orm';

export const createTimeEntry = async (input: CreateTimeEntryInput): Promise<TimeEntry> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Verify that the position exists
    const position = await db.select()
      .from(positionsTable)
      .where(eq(positionsTable.id, input.position_id))
      .limit(1)
      .execute();

    if (position.length === 0) {
      throw new Error(`Position with ID ${input.position_id} does not exist`);
    }

    // Insert time entry record
    const result = await db.insert(timeEntriesTable)
      .values({
        user_id: input.user_id,
        position_id: input.position_id,
        description: input.description,
        hours: input.hours.toString(), // Convert number to string for numeric column
        date: input.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        billable: input.billable // Boolean column - no conversion needed
      })
      .returning()
      .execute();

    // Convert numeric fields and date back to proper types before returning
    const timeEntry = result[0];
    return {
      ...timeEntry,
      hours: parseFloat(timeEntry.hours), // Convert string back to number
      date: new Date(timeEntry.date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Time entry creation failed:', error);
    throw error;
  }
};
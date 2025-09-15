import { db } from '../db';
import { clientNotesTable, clientsTable, usersTable } from '../db/schema';
import { type CreateClientNoteInput, type ClientNote } from '../schema';
import { eq } from 'drizzle-orm';

export const createClientNote = async (input: CreateClientNoteInput): Promise<ClientNote> => {
  try {
    // Verify that the client exists
    const client = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, input.client_id))
      .execute();

    if (client.length === 0) {
      throw new Error(`Client with id ${input.client_id} not found`);
    }

    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert client note record
    const result = await db.insert(clientNotesTable)
      .values({
        client_id: input.client_id,
        user_id: input.user_id,
        note: input.note
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Client note creation failed:', error);
    throw error;
  }
};
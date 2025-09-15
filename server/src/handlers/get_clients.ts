import { db } from '../db';
import { clientsTable } from '../db/schema';
import { type Client } from '../schema';

export const getClients = async (): Promise<Client[]> => {
  try {
    // Fetch all clients from the database
    const results = await db.select()
      .from(clientsTable)
      .execute();

    // Return clients (no numeric conversion needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
};
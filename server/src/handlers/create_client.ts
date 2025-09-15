import { db } from '../db';
import { clientsTable } from '../db/schema';
import { type CreateClientInput, type Client } from '../schema';

export const createClient = async (input: CreateClientInput): Promise<Client> => {
  try {
    // Insert client record
    const result = await db.insert(clientsTable)
      .values({
        name: input.name,
        address: input.address,
        industry: input.industry
      })
      .returning()
      .execute();

    // Return the created client
    return result[0];
  } catch (error) {
    console.error('Client creation failed:', error);
    throw error;
  }
};
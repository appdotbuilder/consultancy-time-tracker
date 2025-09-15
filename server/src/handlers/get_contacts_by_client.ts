import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type Contact } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getContactsByClientInputSchema = z.object({
    client_id: z.number()
});

export const getContactsByClient = async (input: z.infer<typeof getContactsByClientInputSchema>): Promise<Contact[]> => {
    try {
        const results = await db.select()
            .from(contactsTable)
            .where(eq(contactsTable.client_id, input.client_id))
            .execute();

        return results;
    } catch (error) {
        console.error('Failed to fetch contacts by client:', error);
        throw error;
    }
};
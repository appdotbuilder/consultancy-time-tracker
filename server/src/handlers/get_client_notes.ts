import { db } from '../db';
import { clientNotesTable } from '../db/schema';
import { type ClientNote } from '../schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const getClientNotesInputSchema = z.object({
    client_id: z.number()
});

export type GetClientNotesInput = z.infer<typeof getClientNotesInputSchema>;

export const getClientNotes = async (input: GetClientNotesInput): Promise<ClientNote[]> => {
    try {
        const results = await db.select()
            .from(clientNotesTable)
            .where(eq(clientNotesTable.client_id, input.client_id))
            .orderBy(desc(clientNotesTable.created_at))
            .execute();

        return results;
    } catch (error) {
        console.error('Failed to fetch client notes:', error);
        throw error;
    }
};
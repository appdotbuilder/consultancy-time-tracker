import { db } from '../db';
import { contactsTable } from '../db/schema';
import { type CreateContactInput, type Contact } from '../schema';

export const createContact = async (input: CreateContactInput): Promise<Contact> => {
  try {
    // Insert contact record
    const result = await db.insert(contactsTable)
      .values({
        client_id: input.client_id,
        name: input.name,
        email: input.email,
        phone: input.phone
      })
      .returning()
      .execute();

    // Return the created contact
    const contact = result[0];
    return contact;
  } catch (error) {
    console.error('Contact creation failed:', error);
    throw error;
  }
};
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, contactsTable } from '../db/schema';
import { type CreateClientInput, type CreateContactInput } from '../schema';
import { getContactsByClient } from '../handlers/get_contacts_by_client';

// Test data setup
const testClient: CreateClientInput = {
    name: 'Test Client',
    address: '123 Test Street',
    industry: 'Technology'
};

const testContact1: CreateContactInput = {
    client_id: 1, // Will be updated after client creation
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0101'
};

const testContact2: CreateContactInput = {
    client_id: 1, // Will be updated after client creation
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1-555-0102'
};

const testContact3: CreateContactInput = {
    client_id: 2, // Different client
    name: 'Bob Wilson',
    email: 'bob@example.com',
    phone: '+1-555-0103'
};

describe('getContactsByClient', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return contacts for a specific client', async () => {
        // Create test client
        const clientResult = await db.insert(clientsTable)
            .values(testClient)
            .returning()
            .execute();
        const createdClient = clientResult[0];

        // Create contacts for the client
        const contact1Data = { ...testContact1, client_id: createdClient.id };
        const contact2Data = { ...testContact2, client_id: createdClient.id };

        await db.insert(contactsTable)
            .values([contact1Data, contact2Data])
            .execute();

        // Fetch contacts by client
        const result = await getContactsByClient({ client_id: createdClient.id });

        // Verify results
        expect(result).toHaveLength(2);
        expect(result[0].client_id).toBe(createdClient.id);
        expect(result[1].client_id).toBe(createdClient.id);

        // Check contact details
        const contactNames = result.map(contact => contact.name).sort();
        expect(contactNames).toEqual(['Jane Smith', 'John Doe']);

        const contactEmails = result.map(contact => contact.email).sort();
        expect(contactEmails).toEqual(['jane@example.com', 'john@example.com']);
    });

    it('should return empty array when client has no contacts', async () => {
        // Create test client without contacts
        const clientResult = await db.insert(clientsTable)
            .values(testClient)
            .returning()
            .execute();
        const createdClient = clientResult[0];

        // Fetch contacts by client
        const result = await getContactsByClient({ client_id: createdClient.id });

        // Should return empty array
        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return only contacts for the specified client', async () => {
        // Create two test clients
        const client1Result = await db.insert(clientsTable)
            .values(testClient)
            .returning()
            .execute();
        const createdClient1 = client1Result[0];

        const client2Result = await db.insert(clientsTable)
            .values({ ...testClient, name: 'Test Client 2' })
            .returning()
            .execute();
        const createdClient2 = client2Result[0];

        // Create contacts for both clients
        const contact1Data = { ...testContact1, client_id: createdClient1.id };
        const contact2Data = { ...testContact2, client_id: createdClient1.id };
        const contact3Data = { ...testContact3, client_id: createdClient2.id };

        await db.insert(contactsTable)
            .values([contact1Data, contact2Data, contact3Data])
            .execute();

        // Fetch contacts for client 1 only
        const result = await getContactsByClient({ client_id: createdClient1.id });

        // Should only return contacts for client 1
        expect(result).toHaveLength(2);
        result.forEach(contact => {
            expect(contact.client_id).toBe(createdClient1.id);
        });

        // Verify the correct contacts are returned
        const contactNames = result.map(contact => contact.name).sort();
        expect(contactNames).toEqual(['Jane Smith', 'John Doe']);
    });

    it('should handle non-existent client_id gracefully', async () => {
        // Try to fetch contacts for a client that doesn't exist
        const result = await getContactsByClient({ client_id: 9999 });

        // Should return empty array
        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return contacts with correct structure and types', async () => {
        // Create test client
        const clientResult = await db.insert(clientsTable)
            .values(testClient)
            .returning()
            .execute();
        const createdClient = clientResult[0];

        // Create a contact for the client
        const contactData = { ...testContact1, client_id: createdClient.id };
        await db.insert(contactsTable)
            .values(contactData)
            .execute();

        // Fetch contacts by client
        const result = await getContactsByClient({ client_id: createdClient.id });

        // Verify structure and types
        expect(result).toHaveLength(1);
        const contact = result[0];

        expect(typeof contact.id).toBe('number');
        expect(typeof contact.client_id).toBe('number');
        expect(typeof contact.name).toBe('string');
        expect(typeof contact.email).toBe('string');
        expect(typeof contact.phone).toBe('string');
        expect(contact.created_at).toBeInstanceOf(Date);
        expect(contact.updated_at).toBeInstanceOf(Date);

        // Verify field values
        expect(contact.client_id).toBe(createdClient.id);
        expect(contact.name).toBe('John Doe');
        expect(contact.email).toBe('john@example.com');
        expect(contact.phone).toBe('+1-555-0101');
    });
});
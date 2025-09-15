import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contactsTable, clientsTable } from '../db/schema';
import { type CreateContactInput } from '../schema';
import { createContact } from '../handlers/create_contact';
import { eq } from 'drizzle-orm';

describe('createContact', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testClientId: number;

  beforeEach(async () => {
    // Create a test client first since contacts require a client_id
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Test St',
        industry: 'Technology'
      })
      .returning()
      .execute();

    testClientId = clientResult[0].id;
  });

  it('should create a contact with all fields', async () => {
    const testInput: CreateContactInput = {
      client_id: testClientId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123'
    };

    const result = await createContact(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.client_id).toEqual(testClientId);
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a contact with minimal required fields', async () => {
    const testInput: CreateContactInput = {
      client_id: testClientId,
      name: 'Jane Smith',
      email: null,
      phone: null
    };

    const result = await createContact(testInput);

    expect(result.id).toBeDefined();
    expect(result.client_id).toEqual(testClientId);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save contact to database', async () => {
    const testInput: CreateContactInput = {
      client_id: testClientId,
      name: 'Test Contact',
      email: 'test@example.com',
      phone: '555-1234'
    };

    const result = await createContact(testInput);

    // Query using proper drizzle syntax
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, result.id))
      .execute();

    expect(contacts).toHaveLength(1);
    expect(contacts[0].client_id).toEqual(testClientId);
    expect(contacts[0].name).toEqual('Test Contact');
    expect(contacts[0].email).toEqual('test@example.com');
    expect(contacts[0].phone).toEqual('555-1234');
    expect(contacts[0].created_at).toBeInstanceOf(Date);
    expect(contacts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple contacts for the same client', async () => {
    const firstContact: CreateContactInput = {
      client_id: testClientId,
      name: 'First Contact',
      email: 'first@example.com',
      phone: null
    };

    const secondContact: CreateContactInput = {
      client_id: testClientId,
      name: 'Second Contact',
      email: null,
      phone: '555-9999'
    };

    const firstResult = await createContact(firstContact);
    const secondResult = await createContact(secondContact);

    // Both contacts should be created successfully
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.client_id).toEqual(testClientId);
    expect(secondResult.client_id).toEqual(testClientId);

    // Verify both are in database
    const contacts = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.client_id, testClientId))
      .execute();

    expect(contacts).toHaveLength(2);
    const contactNames = contacts.map(c => c.name).sort();
    expect(contactNames).toEqual(['First Contact', 'Second Contact']);
  });

  it('should handle foreign key constraint violation', async () => {
    const invalidInput: CreateContactInput = {
      client_id: 99999, // Non-existent client ID
      name: 'Invalid Contact',
      email: 'invalid@example.com',
      phone: null
    };

    await expect(createContact(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
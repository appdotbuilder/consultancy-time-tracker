import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable } from '../db/schema';
import { type CreateClientInput } from '../schema';
import { createClient } from '../handlers/create_client';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInputComplete: CreateClientInput = {
  name: 'Acme Corporation',
  address: '123 Business Street, Suite 100, Business City, BC 12345',
  industry: 'Technology'
};

// Test input with nullable fields as null
const testInputMinimal: CreateClientInput = {
  name: 'Minimal Corp',
  address: null,
  industry: null
};

describe('createClient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a client with all fields', async () => {
    const result = await createClient(testInputComplete);

    // Basic field validation
    expect(result.name).toEqual('Acme Corporation');
    expect(result.address).toEqual('123 Business Street, Suite 100, Business City, BC 12345');
    expect(result.industry).toEqual('Technology');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a client with minimal fields', async () => {
    const result = await createClient(testInputMinimal);

    // Basic field validation
    expect(result.name).toEqual('Minimal Corp');
    expect(result.address).toBeNull();
    expect(result.industry).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save client to database', async () => {
    const result = await createClient(testInputComplete);

    // Query the database to verify persistence
    const clients = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, result.id))
      .execute();

    expect(clients).toHaveLength(1);
    const savedClient = clients[0];
    expect(savedClient.name).toEqual('Acme Corporation');
    expect(savedClient.address).toEqual('123 Business Street, Suite 100, Business City, BC 12345');
    expect(savedClient.industry).toEqual('Technology');
    expect(savedClient.created_at).toBeInstanceOf(Date);
    expect(savedClient.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple clients with unique IDs', async () => {
    const client1 = await createClient(testInputComplete);
    const client2 = await createClient(testInputMinimal);

    // Verify both clients have unique IDs
    expect(client1.id).not.toEqual(client2.id);
    expect(client1.id).toBeGreaterThan(0);
    expect(client2.id).toBeGreaterThan(0);

    // Verify both are saved in database
    const allClients = await db.select()
      .from(clientsTable)
      .execute();

    expect(allClients).toHaveLength(2);
    const clientIds = allClients.map(c => c.id);
    expect(clientIds).toContain(client1.id);
    expect(clientIds).toContain(client2.id);
  });

  it('should handle empty string fields appropriately', async () => {
    const inputWithEmptyStrings: CreateClientInput = {
      name: 'Empty Fields Corp',
      address: '',
      industry: ''
    };

    const result = await createClient(inputWithEmptyStrings);

    expect(result.name).toEqual('Empty Fields Corp');
    expect(result.address).toEqual('');
    expect(result.industry).toEqual('');

    // Verify in database
    const clients = await db.select()
      .from(clientsTable)
      .where(eq(clientsTable.id, result.id))
      .execute();

    expect(clients[0].address).toEqual('');
    expect(clients[0].industry).toEqual('');
  });
});
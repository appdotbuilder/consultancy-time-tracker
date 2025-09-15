import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable } from '../db/schema';
import { type CreateClientInput } from '../schema';
import { getClients } from '../handlers/get_clients';

describe('getClients', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no clients exist', async () => {
    const result = await getClients();

    expect(result).toEqual([]);
  });

  it('should return all clients when clients exist', async () => {
    // Create test clients
    const client1: CreateClientInput = {
      name: 'Test Client 1',
      address: '123 Main St',
      industry: 'Technology'
    };

    const client2: CreateClientInput = {
      name: 'Test Client 2',
      address: null,
      industry: 'Finance'
    };

    const client3: CreateClientInput = {
      name: 'Test Client 3',
      address: '456 Oak Ave',
      industry: null
    };

    // Insert test clients
    await db.insert(clientsTable)
      .values([client1, client2, client3])
      .execute();

    const result = await getClients();

    // Should return all 3 clients
    expect(result).toHaveLength(3);

    // Verify client data structure and fields
    result.forEach(client => {
      expect(client.id).toBeDefined();
      expect(typeof client.id).toBe('number');
      expect(client.name).toBeDefined();
      expect(typeof client.name).toBe('string');
      expect(client.created_at).toBeInstanceOf(Date);
      expect(client.updated_at).toBeInstanceOf(Date);
    });

    // Check specific client data
    const clientNames = result.map(c => c.name).sort();
    expect(clientNames).toEqual(['Test Client 1', 'Test Client 2', 'Test Client 3']);

    // Verify nullable fields are handled correctly
    const client1Result = result.find(c => c.name === 'Test Client 1');
    expect(client1Result?.address).toBe('123 Main St');
    expect(client1Result?.industry).toBe('Technology');

    const client2Result = result.find(c => c.name === 'Test Client 2');
    expect(client2Result?.address).toBeNull();
    expect(client2Result?.industry).toBe('Finance');

    const client3Result = result.find(c => c.name === 'Test Client 3');
    expect(client3Result?.address).toBe('456 Oak Ave');
    expect(client3Result?.industry).toBeNull();
  });

  it('should maintain correct order when retrieving clients', async () => {
    // Create clients with different timestamps
    const client1: CreateClientInput = {
      name: 'First Client',
      address: null,
      industry: null
    };

    const client2: CreateClientInput = {
      name: 'Second Client',
      address: null,
      industry: null
    };

    // Insert clients one by one to ensure different timestamps
    const result1 = await db.insert(clientsTable)
      .values(client1)
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const result2 = await db.insert(clientsTable)
      .values(client2)
      .returning()
      .execute();

    const allClients = await getClients();

    expect(allClients).toHaveLength(2);

    // Verify the clients are returned in database order
    expect(allClients[0].id).toBe(result1[0].id);
    expect(allClients[1].id).toBe(result2[0].id);
  });

  it('should handle clients with all nullable fields as null', async () => {
    const clientWithNulls: CreateClientInput = {
      name: 'Minimal Client',
      address: null,
      industry: null
    };

    await db.insert(clientsTable)
      .values(clientWithNulls)
      .execute();

    const result = await getClients();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Minimal Client');
    expect(result[0].address).toBeNull();
    expect(result[0].industry).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});
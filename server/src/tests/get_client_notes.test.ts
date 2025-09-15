import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, usersTable, clientNotesTable } from '../db/schema';
import { type GetClientNotesInput } from '../handlers/get_client_notes';
import { getClientNotes } from '../handlers/get_client_notes';

describe('getClientNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return client notes for a valid client', async () => {
    // Create a client
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Main St',
        industry: 'Technology'
      })
      .returning()
      .execute();

    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();

    const client = clientResult[0];
    const user = userResult[0];

    // Create test notes with separate inserts to ensure different timestamps
    await db.insert(clientNotesTable)
      .values({
        client_id: client.id,
        user_id: user.id,
        note: 'First note'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(clientNotesTable)
      .values({
        client_id: client.id,
        user_id: user.id,
        note: 'Second note'
      })
      .execute();

    const input: GetClientNotesInput = {
      client_id: client.id
    };

    const result = await getClientNotes(input);

    expect(result).toHaveLength(2);
    expect(result[0].note).toEqual('Second note'); // Should be ordered by created_at DESC
    expect(result[1].note).toEqual('First note');
    expect(result[0].client_id).toEqual(client.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for client with no notes', async () => {
    // Create a client without notes
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Client Without Notes',
        address: null,
        industry: null
      })
      .returning()
      .execute();

    const input: GetClientNotesInput = {
      client_id: clientResult[0].id
    };

    const result = await getClientNotes(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent client', async () => {
    const input: GetClientNotesInput = {
      client_id: 999
    };

    const result = await getClientNotes(input);

    expect(result).toHaveLength(0);
  });

  it('should return notes in correct order (newest first)', async () => {
    // Create a client
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: null,
        industry: null
      })
      .returning()
      .execute();

    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'administrator',
        hourly_rate: null
      })
      .returning()
      .execute();

    const client = clientResult[0];
    const user = userResult[0];

    // Create multiple notes with slight delay to ensure different timestamps
    const firstNote = await db.insert(clientNotesTable)
      .values({
        client_id: client.id,
        user_id: user.id,
        note: 'Oldest note'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondNote = await db.insert(clientNotesTable)
      .values({
        client_id: client.id,
        user_id: user.id,
        note: 'Middle note'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const thirdNote = await db.insert(clientNotesTable)
      .values({
        client_id: client.id,
        user_id: user.id,
        note: 'Newest note'
      })
      .returning()
      .execute();

    const input: GetClientNotesInput = {
      client_id: client.id
    };

    const result = await getClientNotes(input);

    expect(result).toHaveLength(3);
    expect(result[0].note).toEqual('Newest note');
    expect(result[1].note).toEqual('Middle note');
    expect(result[2].note).toEqual('Oldest note');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should only return notes for the specified client', async () => {
    // Create two clients
    const client1Result = await db.insert(clientsTable)
      .values({
        name: 'Client 1',
        address: null,
        industry: null
      })
      .returning()
      .execute();

    const client2Result = await db.insert(clientsTable)
      .values({
        name: 'Client 2',
        address: null,
        industry: null
      })
      .returning()
      .execute();

    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'project_manager',
        hourly_rate: '75.50'
      })
      .returning()
      .execute();

    const client1 = client1Result[0];
    const client2 = client2Result[0];
    const user = userResult[0];

    // Create notes for both clients
    await db.insert(clientNotesTable)
      .values([
        {
          client_id: client1.id,
          user_id: user.id,
          note: 'Note for client 1'
        },
        {
          client_id: client2.id,
          user_id: user.id,
          note: 'Note for client 2'
        }
      ])
      .execute();

    const input: GetClientNotesInput = {
      client_id: client1.id
    };

    const result = await getClientNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].note).toEqual('Note for client 1');
    expect(result[0].client_id).toEqual(client1.id);
  });
});
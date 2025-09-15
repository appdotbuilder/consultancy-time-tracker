import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientNotesTable, clientsTable, usersTable } from '../db/schema';
import { type CreateClientNoteInput } from '../schema';
import { createClientNote } from '../handlers/create_client_note';
import { eq } from 'drizzle-orm';

// Test data setup
const testClient = {
  name: 'Test Client Corp',
  address: '123 Business St',
  industry: 'Technology'
};

const testUser = {
  email: 'consultant@example.com',
  name: 'John Consultant',
  role: 'consultant' as const,
  hourly_rate: '75.00'
};

describe('createClientNote', () => {
  let clientId: number;
  let userId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite client
    const clientResult = await db.insert(clientsTable)
      .values(testClient)
      .returning()
      .execute();
    clientId = clientResult[0].id;

    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a client note', async () => {
    const testInput: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: 'Client is interested in expanding their software development team'
    };

    const result = await createClientNote(testInput);

    // Basic field validation
    expect(result.client_id).toEqual(clientId);
    expect(result.user_id).toEqual(userId);
    expect(result.note).toEqual(testInput.note);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save client note to database', async () => {
    const testInput: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: 'Important meeting scheduled for next week'
    };

    const result = await createClientNote(testInput);

    // Query using proper drizzle syntax
    const notes = await db.select()
      .from(clientNotesTable)
      .where(eq(clientNotesTable.id, result.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].client_id).toEqual(clientId);
    expect(notes[0].user_id).toEqual(userId);
    expect(notes[0].note).toEqual(testInput.note);
    expect(notes[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple notes for the same client', async () => {
    const firstNote: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: 'Initial consultation completed'
    };

    const secondNote: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: 'Follow-up meeting scheduled'
    };

    await createClientNote(firstNote);
    await createClientNote(secondNote);

    // Query all notes for the client
    const notes = await db.select()
      .from(clientNotesTable)
      .where(eq(clientNotesTable.client_id, clientId))
      .execute();

    expect(notes).toHaveLength(2);
    expect(notes.map(n => n.note)).toContain(firstNote.note);
    expect(notes.map(n => n.note)).toContain(secondNote.note);
  });

  it('should throw error when client does not exist', async () => {
    const testInput: CreateClientNoteInput = {
      client_id: 999999, // Non-existent client ID
      user_id: userId,
      note: 'This should fail'
    };

    await expect(createClientNote(testInput)).rejects.toThrow(/Client with id 999999 not found/i);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateClientNoteInput = {
      client_id: clientId,
      user_id: 999999, // Non-existent user ID
      note: 'This should also fail'
    };

    await expect(createClientNote(testInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should handle long notes correctly', async () => {
    const longNote = 'A'.repeat(1000); // 1000 character note
    const testInput: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: longNote
    };

    const result = await createClientNote(testInput);

    expect(result.note).toEqual(longNote);
    expect(result.note.length).toEqual(1000);

    // Verify in database
    const notes = await db.select()
      .from(clientNotesTable)
      .where(eq(clientNotesTable.id, result.id))
      .execute();

    expect(notes[0].note).toEqual(longNote);
  });

  it('should preserve timestamps correctly', async () => {
    const testInput: CreateClientNoteInput = {
      client_id: clientId,
      user_id: userId,
      note: 'Testing timestamp preservation'
    };

    const beforeCreation = new Date();
    const result = await createClientNote(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});
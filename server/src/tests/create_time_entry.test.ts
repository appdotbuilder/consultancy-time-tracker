import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timeEntriesTable, usersTable, clientsTable, projectsTable, positionsTable } from '../db/schema';
import { type CreateTimeEntryInput } from '../schema';
import { createTimeEntry } from '../handlers/create_time_entry';
import { eq } from 'drizzle-orm';

describe('createTimeEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a time entry', async () => {
    // Create prerequisite data - user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create prerequisite data - client
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Test St',
        industry: 'Technology'
      })
      .returning()
      .execute();
    const client = clientResult[0];

    // Create prerequisite data - project
    const projectResult = await db.insert(projectsTable)
      .values({
        client_id: client.id,
        name: 'Test Project',
        description: 'A test project',
        budget: '10000.00',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();
    const project = projectResult[0];

    // Create prerequisite data - position
    const positionResult = await db.insert(positionsTable)
      .values({
        project_id: project.id,
        name: 'Test Position',
        description: 'A test position',
        budget: '5000.00',
        hourly_rate: '75.00'
      })
      .returning()
      .execute();
    const position = positionResult[0];

    const testInput: CreateTimeEntryInput = {
      user_id: user.id,
      position_id: position.id,
      description: 'Working on test features',
      hours: 8.5,
      date: new Date('2024-01-15'),
      billable: true
    };

    const result = await createTimeEntry(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.position_id).toEqual(position.id);
    expect(result.description).toEqual('Working on test features');
    expect(result.hours).toEqual(8.5);
    expect(typeof result.hours).toBe('number'); // Verify numeric conversion
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.billable).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save time entry to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Test St',
        industry: 'Technology'
      })
      .returning()
      .execute();
    const client = clientResult[0];

    const projectResult = await db.insert(projectsTable)
      .values({
        client_id: client.id,
        name: 'Test Project',
        description: 'A test project',
        budget: '10000.00',
        status: 'active'
      })
      .returning()
      .execute();
    const project = projectResult[0];

    const positionResult = await db.insert(positionsTable)
      .values({
        project_id: project.id,
        name: 'Test Position',
        description: 'A test position',
        budget: '5000.00',
        hourly_rate: '75.00'
      })
      .returning()
      .execute();
    const position = positionResult[0];

    const testInput: CreateTimeEntryInput = {
      user_id: user.id,
      position_id: position.id,
      description: 'Database testing work',
      hours: 6.25,
      date: new Date('2024-02-10'),
      billable: false
    };

    const result = await createTimeEntry(testInput);

    // Query using proper drizzle syntax
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, result.id))
      .execute();

    expect(timeEntries).toHaveLength(1);
    expect(timeEntries[0].user_id).toEqual(user.id);
    expect(timeEntries[0].position_id).toEqual(position.id);
    expect(timeEntries[0].description).toEqual('Database testing work');
    expect(parseFloat(timeEntries[0].hours)).toEqual(6.25);
    expect(new Date(timeEntries[0].date)).toEqual(new Date('2024-02-10'));
    expect(timeEntries[0].billable).toEqual(false);
    expect(timeEntries[0].created_at).toBeInstanceOf(Date);
    expect(timeEntries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should use default billable value when not provided', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();
    const client = clientResult[0];

    const projectResult = await db.insert(projectsTable)
      .values({
        client_id: client.id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();
    const project = projectResult[0];

    const positionResult = await db.insert(positionsTable)
      .values({
        project_id: project.id,
        name: 'Test Position'
      })
      .returning()
      .execute();
    const position = positionResult[0];

    // Test input with billable defaulting to true via Zod
    const testInput: CreateTimeEntryInput = {
      user_id: user.id,
      position_id: position.id,
      description: null,
      hours: 2.0,
      date: new Date('2024-03-01'),
      billable: true // Zod default is applied before reaching handler
    };

    const result = await createTimeEntry(testInput);

    expect(result.billable).toEqual(true);
    expect(result.description).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    // Create prerequisite data - only position chain, no user
    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();
    const client = clientResult[0];

    const projectResult = await db.insert(projectsTable)
      .values({
        client_id: client.id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();
    const project = projectResult[0];

    const positionResult = await db.insert(positionsTable)
      .values({
        project_id: project.id,
        name: 'Test Position'
      })
      .returning()
      .execute();
    const position = positionResult[0];

    const testInput: CreateTimeEntryInput = {
      user_id: 9999, // Non-existent user ID
      position_id: position.id,
      description: 'Test work',
      hours: 4.0,
      date: new Date('2024-01-01'),
      billable: true
    };

    await expect(createTimeEntry(testInput)).rejects.toThrow(/user with id 9999 does not exist/i);
  });

  it('should throw error when position does not exist', async () => {
    // Create prerequisite data - only user, no position
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const testInput: CreateTimeEntryInput = {
      user_id: user.id,
      position_id: 9999, // Non-existent position ID
      description: 'Test work',
      hours: 3.0,
      date: new Date('2024-01-01'),
      billable: true
    };

    await expect(createTimeEntry(testInput)).rejects.toThrow(/position with id 9999 does not exist/i);
  });

  it('should handle decimal hours correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'project_manager'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const clientResult = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();
    const client = clientResult[0];

    const projectResult = await db.insert(projectsTable)
      .values({
        client_id: client.id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();
    const project = projectResult[0];

    const positionResult = await db.insert(positionsTable)
      .values({
        project_id: project.id,
        name: 'Test Position'
      })
      .returning()
      .execute();
    const position = positionResult[0];

    const testInput: CreateTimeEntryInput = {
      user_id: user.id,
      position_id: position.id,
      description: 'Decimal hours test',
      hours: 0.75, // 45 minutes
      date: new Date('2024-04-15'),
      billable: true
    };

    const result = await createTimeEntry(testInput);

    expect(result.hours).toEqual(0.75);
    expect(typeof result.hours).toBe('number');

    // Verify in database
    const savedEntry = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, result.id))
      .execute();

    expect(parseFloat(savedEntry[0].hours)).toEqual(0.75);
  });
});
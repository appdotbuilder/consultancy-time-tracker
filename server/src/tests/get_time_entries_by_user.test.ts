import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, clientsTable, projectsTable, positionsTable, timeEntriesTable } from '../db/schema';
import { getTimeEntriesByUser } from '../handlers/get_time_entries_by_user';

describe('getTimeEntriesByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all time entries for a user', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();

    // Create test client
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Test St',
        industry: 'Technology'
      })
      .returning()
      .execute();

    // Create test project
    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        description: 'A test project',
        status: 'active'
      })
      .returning()
      .execute();

    // Create test position
    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer',
        description: 'Software development',
        hourly_rate: '60.00'
      })
      .returning()
      .execute();

    // Create multiple time entries for the user
    await db.insert(timeEntriesTable)
      .values([
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'First task',
          hours: '8.00',
          date: '2024-01-15',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Second task',
          hours: '4.50',
          date: '2024-01-16',
          billable: false
        }
      ])
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id
    });

    expect(result).toHaveLength(2);
    // Results are ordered by date descending (most recent first)
    expect(result[0].user_id).toBe(user[0].id);
    expect(result[0].description).toBe('Second task'); // 2024-01-16 comes first
    expect(result[0].hours).toBe(4.50);
    expect(typeof result[0].hours).toBe('number');
    expect(result[0].billable).toBe(false);

    expect(result[1].user_id).toBe(user[0].id);
    expect(result[1].description).toBe('First task'); // 2024-01-15 comes second
    expect(result[1].hours).toBe(8.00);
    expect(result[1].billable).toBe(true);
  });

  it('should return empty array for user with no time entries', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id
    });

    expect(result).toHaveLength(0);
  });

  it('should filter time entries by start date', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create test client, project, position
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();

    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer'
      })
      .returning()
      .execute();

    // Create time entries with different dates
    await db.insert(timeEntriesTable)
      .values([
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Old task',
          hours: '8.00',
          date: '2024-01-10',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'New task',
          hours: '6.00',
          date: '2024-01-20',
          billable: true
        }
      ])
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id,
      start_date: new Date('2024-01-15')
    });

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('New task');
    expect(result[0].date).toEqual(new Date('2024-01-20T00:00:00.000Z'));
  });

  it('should filter time entries by end date', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create test client, project, position
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();

    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer'
      })
      .returning()
      .execute();

    // Create time entries with different dates
    await db.insert(timeEntriesTable)
      .values([
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Early task',
          hours: '4.00',
          date: '2024-01-10',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Late task',
          hours: '6.00',
          date: '2024-01-25',
          billable: true
        }
      ])
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id,
      end_date: new Date('2024-01-15')
    });

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Early task');
    expect(result[0].date).toEqual(new Date('2024-01-10T00:00:00.000Z'));
  });

  it('should filter time entries by date range', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create test client, project, position
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();

    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer'
      })
      .returning()
      .execute();

    // Create time entries across multiple dates
    await db.insert(timeEntriesTable)
      .values([
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Too early',
          hours: '2.00',
          date: '2024-01-05',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'In range 1',
          hours: '8.00',
          date: '2024-01-10',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'In range 2',
          hours: '6.00',
          date: '2024-01-15',
          billable: true
        },
        {
          user_id: user[0].id,
          position_id: position[0].id,
          description: 'Too late',
          hours: '4.00',
          date: '2024-01-25',
          billable: true
        }
      ])
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id,
      start_date: new Date('2024-01-08'),
      end_date: new Date('2024-01-20')
    });

    expect(result).toHaveLength(2);
    expect(result.map(r => r.description)).toContain('In range 1');
    expect(result.map(r => r.description)).toContain('In range 2');
    expect(result.map(r => r.description)).not.toContain('Too early');
    expect(result.map(r => r.description)).not.toContain('Too late');
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getTimeEntriesByUser({
      user_id: 99999
    });

    expect(result).toHaveLength(0);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create test client, project, position
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        status: 'active'
      })
      .returning()
      .execute();

    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer'
      })
      .returning()
      .execute();

    // Create time entry with decimal hours
    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        description: 'Decimal hours task',
        hours: '7.75',
        date: '2024-01-15',
        billable: true
      })
      .execute();

    const result = await getTimeEntriesByUser({
      user_id: user[0].id
    });

    expect(result).toHaveLength(1);
    expect(result[0].hours).toBe(7.75);
    expect(typeof result[0].hours).toBe('number');
  });
});
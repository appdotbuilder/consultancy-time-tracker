import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, positionsTable, projectsTable, clientsTable, timeEntriesTable } from '../db/schema';
import { type UtilizationReportInput } from '../schema';
import { getUtilizationReport } from '../handlers/get_utilization_report';

describe('getUtilizationReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const input: UtilizationReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);
    expect(result).toEqual([]);
  });

  it('should return utilization report for all users when user_id not specified', async () => {
    // Create test data
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Main St',
        industry: 'Technology'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        client_id: client[0].id,
        name: 'Test Project',
        description: 'A test project',
        status: 'active'
      })
      .returning()
      .execute();

    const position = await db.insert(positionsTable)
      .values({
        project_id: project[0].id,
        name: 'Developer',
        description: 'Software developer position'
      })
      .returning()
      .execute();

    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'John Doe',
          role: 'consultant',
          hourly_rate: '75.00'
        },
        {
          email: 'user2@example.com',
          name: 'Jane Smith',
          role: 'consultant',
          hourly_rate: '80.00'
        }
      ])
      .returning()
      .execute();

    // Create time entries for both users
    await db.insert(timeEntriesTable)
      .values({
        user_id: user1.id,
        position_id: position[0].id,
        description: 'Development work',
        hours: '8.00',
        date: '2024-01-15',
        billable: true
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user1.id,
        position_id: position[0].id,
        description: 'Meeting',
        hours: '2.00',
        date: '2024-01-16',
        billable: false
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user2.id,
        position_id: position[0].id,
        description: 'Code review',
        hours: '4.00',
        date: '2024-01-17',
        billable: true
      })
      .execute();

    const input: UtilizationReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);

    expect(result).toHaveLength(2);
    
    // Find users in result (order may vary)
    const user1Report = result.find(r => r.user_id === user1.id);
    const user2Report = result.find(r => r.user_id === user2.id);

    expect(user1Report).toBeDefined();
    expect(user1Report!.user_name).toEqual('John Doe');
    expect(user1Report!.total_hours).toEqual(10);
    expect(user1Report!.billable_hours).toEqual(8);
    expect(user1Report!.utilization_rate).toEqual(80); // 8/10 * 100
    expect(user1Report!.period_start).toEqual(input.start_date);
    expect(user1Report!.period_end).toEqual(input.end_date);

    expect(user2Report).toBeDefined();
    expect(user2Report!.user_name).toEqual('Jane Smith');
    expect(user2Report!.total_hours).toEqual(4);
    expect(user2Report!.billable_hours).toEqual(4);
    expect(user2Report!.utilization_rate).toEqual(100); // 4/4 * 100
  });

  it('should return utilization report for specific user when user_id provided', async () => {
    // Create test data
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        address: '123 Main St',
        industry: 'Technology'
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

    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'John Doe',
          role: 'consultant',
          hourly_rate: '75.00'
        },
        {
          email: 'user2@example.com',
          name: 'Jane Smith',
          role: 'consultant',
          hourly_rate: '80.00'
        }
      ])
      .returning()
      .execute();

    // Create time entries for both users
    await db.insert(timeEntriesTable)
      .values({
        user_id: user1.id,
        position_id: position[0].id,
        hours: '6.00',
        date: '2024-01-15',
        billable: true
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user2.id,
        position_id: position[0].id,
        hours: '8.00',
        date: '2024-01-15',
        billable: true
      })
      .execute();

    const input: UtilizationReportInput = {
      user_id: user1.id,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].user_name).toEqual('John Doe');
    expect(result[0].total_hours).toEqual(6);
    expect(result[0].billable_hours).toEqual(6);
    expect(result[0].utilization_rate).toEqual(100);
  });

  it('should filter time entries by date range correctly', async () => {
    // Create test data
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        industry: 'Technology'
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

    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'John Doe',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create time entries - some inside range, some outside
    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '4.00',
        date: '2023-12-31', // Outside range (before)
        billable: true
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '6.00',
        date: '2024-01-15', // Inside range
        billable: true
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '2.00',
        date: '2024-01-20', // Inside range
        billable: false
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '8.00',
        date: '2024-02-01', // Outside range (after)
        billable: true
      })
      .execute();

    const input: UtilizationReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_hours).toEqual(8); // Only entries from Jan 15 and 20
    expect(result[0].billable_hours).toEqual(6); // Only billable entry from Jan 15
    expect(result[0].utilization_rate).toEqual(75); // 6/8 * 100
  });

  it('should handle users with no time entries', async () => {
    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'John Doe',
        role: 'consultant'
      })
      .returning()
      .execute();

    const input: UtilizationReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user[0].id);
    expect(result[0].user_name).toEqual('John Doe');
    expect(result[0].total_hours).toEqual(0);
    expect(result[0].billable_hours).toEqual(0);
    expect(result[0].utilization_rate).toEqual(0);
  });

  it('should handle decimal hours correctly', async () => {
    // Create test data
    const client = await db.insert(clientsTable)
      .values({
        name: 'Test Client',
        industry: 'Technology'
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

    const user = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        name: 'John Doe',
        role: 'consultant'
      })
      .returning()
      .execute();

    // Create time entries with decimal hours
    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '7.5',
        date: '2024-01-15',
        billable: true
      })
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        user_id: user[0].id,
        position_id: position[0].id,
        hours: '0.25',
        date: '2024-01-16',
        billable: false
      })
      .execute();

    const input: UtilizationReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_hours).toEqual(7.75);
    expect(result[0].billable_hours).toEqual(7.5);
    expect(result[0].utilization_rate).toEqual(96.77); // 7.5/7.75 * 100, rounded to 2 decimals
  });

  it('should handle non-existent user_id gracefully', async () => {
    const input: UtilizationReportInput = {
      user_id: 999, // Non-existent user
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await getUtilizationReport(input);
    expect(result).toEqual([]);
  });
});
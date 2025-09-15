import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { activityLogsTable, usersTable, clientsTable } from '../db/schema';
import { type CreateActivityLogInput } from '../schema';
import { createActivityLog } from '../handlers/create_activity_log';
import { eq } from 'drizzle-orm';

describe('createActivityLog', () => {
  let testUserId: number;
  let testClientId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '50.00'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create a test client
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

  afterEach(resetDB);

  const testInput: CreateActivityLogInput = {
    client_id: 0, // Will be set in beforeEach
    user_id: 0, // Will be set in beforeEach
    activity_type: 'meeting',
    description: 'Initial client meeting to discuss project requirements',
    activity_date: new Date('2024-01-15')
  };

  it('should create an activity log', async () => {
    const input = { ...testInput, client_id: testClientId, user_id: testUserId };
    const result = await createActivityLog(input);

    // Basic field validation
    expect(result.client_id).toEqual(testClientId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.activity_type).toEqual('meeting');
    expect(result.description).toEqual('Initial client meeting to discuss project requirements');
    expect(result.activity_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save activity log to database', async () => {
    const input = { ...testInput, client_id: testClientId, user_id: testUserId };
    const result = await createActivityLog(input);

    // Query using proper drizzle syntax
    const activityLogs = await db.select()
      .from(activityLogsTable)
      .where(eq(activityLogsTable.id, result.id))
      .execute();

    expect(activityLogs).toHaveLength(1);
    expect(activityLogs[0].client_id).toEqual(testClientId);
    expect(activityLogs[0].user_id).toEqual(testUserId);
    expect(activityLogs[0].activity_type).toEqual('meeting');
    expect(activityLogs[0].description).toEqual('Initial client meeting to discuss project requirements');
    expect(new Date(activityLogs[0].activity_date)).toEqual(new Date('2024-01-15'));
    expect(activityLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should create activity log with call type', async () => {
    const input = {
      client_id: testClientId,
      user_id: testUserId,
      activity_type: 'call' as const,
      description: 'Phone call to discuss project timeline',
      activity_date: new Date('2024-01-16')
    };

    const result = await createActivityLog(input);

    expect(result.activity_type).toEqual('call');
    expect(result.description).toEqual('Phone call to discuss project timeline');
    expect(result.activity_date).toEqual(new Date('2024-01-16'));
  });

  it('should create activity log with email type', async () => {
    const input = {
      client_id: testClientId,
      user_id: testUserId,
      activity_type: 'email' as const,
      description: 'Sent project proposal via email',
      activity_date: new Date('2024-01-17')
    };

    const result = await createActivityLog(input);

    expect(result.activity_type).toEqual('email');
    expect(result.description).toEqual('Sent project proposal via email');
  });

  it('should create activity log with other type', async () => {
    const input = {
      client_id: testClientId,
      user_id: testUserId,
      activity_type: 'other' as const,
      description: 'Site visit to assess requirements',
      activity_date: new Date('2024-01-18')
    };

    const result = await createActivityLog(input);

    expect(result.activity_type).toEqual('other');
    expect(result.description).toEqual('Site visit to assess requirements');
  });

  it('should handle foreign key constraint violation gracefully', async () => {
    const input = {
      client_id: 99999, // Non-existent client
      user_id: testUserId,
      activity_type: 'meeting' as const,
      description: 'Test meeting',
      activity_date: new Date('2024-01-15')
    };

    await expect(createActivityLog(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle invalid user foreign key', async () => {
    const input = {
      client_id: testClientId,
      user_id: 99999, // Non-existent user
      activity_type: 'call' as const,
      description: 'Test call',
      activity_date: new Date('2024-01-15')
    };

    await expect(createActivityLog(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple activity logs for same client', async () => {
    const input1 = {
      client_id: testClientId,
      user_id: testUserId,
      activity_type: 'meeting' as const,
      description: 'First meeting',
      activity_date: new Date('2024-01-15')
    };

    const input2 = {
      client_id: testClientId,
      user_id: testUserId,
      activity_type: 'call' as const,
      description: 'Follow-up call',
      activity_date: new Date('2024-01-16')
    };

    const result1 = await createActivityLog(input1);
    const result2 = await createActivityLog(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.activity_type).toEqual('meeting');
    expect(result2.activity_type).toEqual('call');

    // Verify both records exist in database
    const allLogs = await db.select()
      .from(activityLogsTable)
      .where(eq(activityLogsTable.client_id, testClientId))
      .execute();

    expect(allLogs).toHaveLength(2);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { activityLogsTable, clientsTable, usersTable } from '../db/schema';
import { getActivityLogs } from '../handlers/get_activity_logs';
import { eq } from 'drizzle-orm';

describe('getActivityLogs', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return activity logs for a specific client', async () => {
        // Create prerequisite data
        const [client] = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test St',
                industry: 'Technology'
            })
            .returning()
            .execute();

        const [user] = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                name: 'Test User',
                role: 'consultant',
                hourly_rate: '100.00'
            })
            .returning()
            .execute();

        // Create test activity logs
        const activityLog1 = await db.insert(activityLogsTable)
            .values({
                client_id: client.id,
                user_id: user.id,
                activity_type: 'call',
                description: 'Initial client call',
                activity_date: '2024-01-15'
            })
            .returning()
            .execute();

        const activityLog2 = await db.insert(activityLogsTable)
            .values({
                client_id: client.id,
                user_id: user.id,
                activity_type: 'meeting',
                description: 'Project kickoff meeting',
                activity_date: '2024-01-20'
            })
            .returning()
            .execute();

        // Test the handler
        const result = await getActivityLogs({ client_id: client.id });

        // Verify results
        expect(result).toHaveLength(2);
        expect(result[0].client_id).toEqual(client.id);
        expect(result[0].user_id).toEqual(user.id);
        expect(result[0].activity_type).toEqual('call');
        expect(result[0].description).toEqual('Initial client call');
        expect(result[0].activity_date).toBeInstanceOf(Date);
        expect(result[0].created_at).toBeInstanceOf(Date);
        expect(result[0].id).toBeDefined();

        expect(result[1].client_id).toEqual(client.id);
        expect(result[1].user_id).toEqual(user.id);
        expect(result[1].activity_type).toEqual('meeting');
        expect(result[1].description).toEqual('Project kickoff meeting');
    });

    it('should return empty array when client has no activity logs', async () => {
        // Create a client with no activity logs
        const [client] = await db.insert(clientsTable)
            .values({
                name: 'Empty Client',
                address: null,
                industry: null
            })
            .returning()
            .execute();

        const result = await getActivityLogs({ client_id: client.id });

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return only activity logs for the specified client', async () => {
        // Create two clients
        const [client1] = await db.insert(clientsTable)
            .values({
                name: 'Client 1',
                address: '123 First St',
                industry: 'Tech'
            })
            .returning()
            .execute();

        const [client2] = await db.insert(clientsTable)
            .values({
                name: 'Client 2',
                address: '456 Second St',
                industry: 'Finance'
            })
            .returning()
            .execute();

        const [user] = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                name: 'Test User',
                role: 'consultant',
                hourly_rate: null
            })
            .returning()
            .execute();

        // Create activity logs for both clients
        await db.insert(activityLogsTable)
            .values({
                client_id: client1.id,
                user_id: user.id,
                activity_type: 'call',
                description: 'Call for client 1',
                activity_date: '2024-01-10'
            })
            .execute();

        await db.insert(activityLogsTable)
            .values({
                client_id: client2.id,
                user_id: user.id,
                activity_type: 'email',
                description: 'Email for client 2',
                activity_date: '2024-01-12'
            })
            .execute();

        await db.insert(activityLogsTable)
            .values({
                client_id: client1.id,
                user_id: user.id,
                activity_type: 'other',
                description: 'Another activity for client 1',
                activity_date: '2024-01-15'
            })
            .execute();

        // Get activity logs for client 1 only
        const result = await getActivityLogs({ client_id: client1.id });

        expect(result).toHaveLength(2);
        result.forEach(log => {
            expect(log.client_id).toEqual(client1.id);
        });

        // Verify descriptions match client 1 activities
        const descriptions = result.map(log => log.description);
        expect(descriptions).toContain('Call for client 1');
        expect(descriptions).toContain('Another activity for client 1');
        expect(descriptions).not.toContain('Email for client 2');
    });

    it('should handle different activity types correctly', async () => {
        // Create prerequisite data
        const [client] = await db.insert(clientsTable)
            .values({
                name: 'Activity Type Test Client',
                address: null,
                industry: 'Testing'
            })
            .returning()
            .execute();

        const [user] = await db.insert(usersTable)
            .values({
                email: 'activity@example.com',
                name: 'Activity User',
                role: 'project_manager',
                hourly_rate: '75.50'
            })
            .returning()
            .execute();

        // Create activity logs with all different activity types
        const activityTypes = ['call', 'meeting', 'email', 'other'] as const;
        
        for (const activityType of activityTypes) {
            await db.insert(activityLogsTable)
                .values({
                    client_id: client.id,
                    user_id: user.id,
                    activity_type: activityType,
                    description: `${activityType} activity`,
                    activity_date: '2024-01-01'
                })
                .execute();
        }

        const result = await getActivityLogs({ client_id: client.id });

        expect(result).toHaveLength(4);
        
        // Verify all activity types are present
        const returnedTypes = result.map(log => log.activity_type).sort();
        expect(returnedTypes).toEqual(['call', 'email', 'meeting', 'other']);
        
        // Verify each activity log has the correct description
        result.forEach(log => {
            expect(log.description).toEqual(`${log.activity_type} activity`);
        });
    });

    it('should save activity logs to database correctly', async () => {
        // Create prerequisite data
        const [client] = await db.insert(clientsTable)
            .values({
                name: 'Database Test Client',
                address: '789 Database St',
                industry: null
            })
            .returning()
            .execute();

        const [user] = await db.insert(usersTable)
            .values({
                email: 'db@example.com',
                name: 'Database User',
                role: 'administrator',
                hourly_rate: null
            })
            .returning()
            .execute();

        // Create an activity log
        const [createdLog] = await db.insert(activityLogsTable)
            .values({
                client_id: client.id,
                user_id: user.id,
                activity_type: 'meeting',
                description: 'Database verification meeting',
                activity_date: '2024-02-01'
            })
            .returning()
            .execute();

        // Get activity logs through the handler
        const result = await getActivityLogs({ client_id: client.id });

        // Verify the activity log was retrieved correctly
        expect(result).toHaveLength(1);
        expect(result[0].id).toEqual(createdLog.id);

        // Double-check by querying the database directly
        const directQuery = await db.select()
            .from(activityLogsTable)
            .where(eq(activityLogsTable.id, result[0].id))
            .execute();

        expect(directQuery).toHaveLength(1);
        expect(directQuery[0].client_id).toEqual(client.id);
        expect(directQuery[0].user_id).toEqual(user.id);
        expect(directQuery[0].activity_type).toEqual('meeting');
        expect(directQuery[0].description).toEqual('Database verification meeting');
        expect(directQuery[0].created_at).toBeInstanceOf(Date);
    });
});
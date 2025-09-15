import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, clientsTable, projectsTable, positionsTable, timeEntriesTable } from '../db/schema';
import { type BookingDetailsInput } from '../schema';
import { getBookingDetails } from '../handlers/get_booking_details';

describe('getBookingDetails', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should retrieve booking details for user within date range', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values({
            email: 'test@example.com',
            name: 'Test User',
            role: 'consultant',
            hourly_rate: '50.00'
        }).returning().execute();

        const [client] = await db.insert(clientsTable).values({
            name: 'Test Client',
            address: '123 Test St',
            industry: 'Technology'
        }).returning().execute();

        const [project] = await db.insert(projectsTable).values({
            client_id: client.id,
            name: 'Test Project',
            description: 'A test project',
            budget: '10000.00',
            status: 'active',
            start_date: '2024-01-01',
            end_date: '2024-12-31'
        }).returning().execute();

        const [position] = await db.insert(positionsTable).values({
            project_id: project.id,
            name: 'Senior Developer',
            description: 'Development work',
            budget: '5000.00',
            hourly_rate: '75.00'
        }).returning().execute();

        // Create time entries on different dates
        const timeEntry1 = await db.insert(timeEntriesTable).values({
            user_id: user.id,
            position_id: position.id,
            description: 'Development work',
            hours: '8.00',
            date: '2024-01-15',
            billable: true
        }).returning().execute();

        const timeEntry2 = await db.insert(timeEntriesTable).values({
            user_id: user.id,
            position_id: position.id,
            description: 'Code review',
            hours: '4.50',
            date: '2024-01-15',
            billable: true
        }).returning().execute();

        const timeEntry3 = await db.insert(timeEntriesTable).values({
            user_id: user.id,
            position_id: position.id,
            description: 'Meeting',
            hours: '2.00',
            date: '2024-01-16',
            billable: false
        }).returning().execute();

        // Test input
        const input: BookingDetailsInput = {
            user_id: user.id,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getBookingDetails(input);

        // Should have 2 days of entries (grouped by date)
        expect(result).toHaveLength(2);

        // Sort by date descending for predictable testing
        result.sort((a, b) => b.date.getTime() - a.date.getTime());

        // Check first day (2024-01-16)
        const day1 = result[0];
        expect(day1.date).toEqual(new Date('2024-01-16'));
        expect(day1.total_hours).toEqual(2.00);
        expect(day1.entries).toHaveLength(1);
        expect(day1.entries[0].time_entry_id).toEqual(timeEntry3[0].id);
        expect(day1.entries[0].position_name).toEqual('Senior Developer');
        expect(day1.entries[0].project_name).toEqual('Test Project');
        expect(day1.entries[0].client_name).toEqual('Test Client');
        expect(day1.entries[0].description).toEqual('Meeting');
        expect(day1.entries[0].hours).toEqual(2.00);
        expect(day1.entries[0].billable).toEqual(false);

        // Check second day (2024-01-15)
        const day2 = result[1];
        expect(day2.date).toEqual(new Date('2024-01-15'));
        expect(day2.total_hours).toEqual(12.50); // 8.00 + 4.50
        expect(day2.entries).toHaveLength(2);
        
        // Verify both entries are present
        const entryIds = day2.entries.map(e => e.time_entry_id).sort();
        expect(entryIds).toEqual([timeEntry1[0].id, timeEntry2[0].id].sort());
        
        // Check one of the entries in detail
        const devEntry = day2.entries.find(e => e.description === 'Development work');
        expect(devEntry).toBeDefined();
        expect(devEntry!.hours).toEqual(8.00);
        expect(devEntry!.billable).toEqual(true);
    });

    it('should return empty array when no entries exist in date range', async () => {
        // Create test user
        const [user] = await db.insert(usersTable).values({
            email: 'test@example.com',
            name: 'Test User',
            role: 'consultant',
            hourly_rate: '50.00'
        }).returning().execute();

        const input: BookingDetailsInput = {
            user_id: user.id,
            start_date: new Date('2024-06-01'),
            end_date: new Date('2024-06-30')
        };

        const result = await getBookingDetails(input);

        expect(result).toEqual([]);
    });

    it('should filter entries by date range correctly', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values({
            email: 'test@example.com',
            name: 'Test User',
            role: 'consultant',
            hourly_rate: '50.00'
        }).returning().execute();

        const [client] = await db.insert(clientsTable).values({
            name: 'Test Client',
            address: '123 Test St',
            industry: 'Technology'
        }).returning().execute();

        const [project] = await db.insert(projectsTable).values({
            client_id: client.id,
            name: 'Test Project',
            description: 'A test project',
            budget: '10000.00',
            status: 'active'
        }).returning().execute();

        const [position] = await db.insert(positionsTable).values({
            project_id: project.id,
            name: 'Developer',
            description: 'Development work',
            budget: '5000.00',
            hourly_rate: '75.00'
        }).returning().execute();

        // Create time entries - some inside range, some outside
        await db.insert(timeEntriesTable).values([
            {
                user_id: user.id,
                position_id: position.id,
                description: 'Before range',
                hours: '2.00',
                date: '2024-01-01', // Before start_date
                billable: true
            },
            {
                user_id: user.id,
                position_id: position.id,
                description: 'In range',
                hours: '4.00',
                date: '2024-01-15', // Within range
                billable: true
            },
            {
                user_id: user.id,
                position_id: position.id,
                description: 'After range',
                hours: '3.00',
                date: '2024-02-01', // After end_date
                billable: true
            }
        ]).execute();

        const input: BookingDetailsInput = {
            user_id: user.id,
            start_date: new Date('2024-01-10'),
            end_date: new Date('2024-01-20')
        };

        const result = await getBookingDetails(input);

        // Should only return the entry within the date range
        expect(result).toHaveLength(1);
        expect(result[0].entries).toHaveLength(1);
        expect(result[0].entries[0].description).toEqual('In range');
        expect(result[0].total_hours).toEqual(4.00);
    });

    it('should only return entries for specified user', async () => {
        // Create two users
        const [user1] = await db.insert(usersTable).values({
            email: 'user1@example.com',
            name: 'User One',
            role: 'consultant',
            hourly_rate: '50.00'
        }).returning().execute();

        const [user2] = await db.insert(usersTable).values({
            email: 'user2@example.com',
            name: 'User Two',
            role: 'consultant',
            hourly_rate: '60.00'
        }).returning().execute();

        // Create shared project structure
        const [client] = await db.insert(clientsTable).values({
            name: 'Shared Client',
            industry: 'Technology'
        }).returning().execute();

        const [project] = await db.insert(projectsTable).values({
            client_id: client.id,
            name: 'Shared Project',
            status: 'active'
        }).returning().execute();

        const [position] = await db.insert(positionsTable).values({
            project_id: project.id,
            name: 'Developer',
            hourly_rate: '75.00'
        }).returning().execute();

        // Create time entries for both users
        await db.insert(timeEntriesTable).values([
            {
                user_id: user1.id,
                position_id: position.id,
                description: 'User 1 work',
                hours: '6.00',
                date: '2024-01-15',
                billable: true
            },
            {
                user_id: user2.id,
                position_id: position.id,
                description: 'User 2 work',
                hours: '8.00',
                date: '2024-01-15',
                billable: true
            }
        ]).execute();

        const input: BookingDetailsInput = {
            user_id: user1.id,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getBookingDetails(input);

        // Should only return user1's entries
        expect(result).toHaveLength(1);
        expect(result[0].entries).toHaveLength(1);
        expect(result[0].entries[0].description).toEqual('User 1 work');
        expect(result[0].total_hours).toEqual(6.00);
    });

    it('should handle numeric field conversions correctly', async () => {
        // Create test data
        const [user] = await db.insert(usersTable).values({
            email: 'test@example.com',
            name: 'Test User',
            role: 'consultant',
            hourly_rate: '50.00'
        }).returning().execute();

        const [client] = await db.insert(clientsTable).values({
            name: 'Test Client'
        }).returning().execute();

        const [project] = await db.insert(projectsTable).values({
            client_id: client.id,
            name: 'Test Project',
            status: 'active'
        }).returning().execute();

        const [position] = await db.insert(positionsTable).values({
            project_id: project.id,
            name: 'Developer'
        }).returning().execute();

        await db.insert(timeEntriesTable).values({
            user_id: user.id,
            position_id: position.id,
            description: 'Test work',
            hours: '7.25', // Decimal hours
            date: '2024-01-15',
            billable: true
        }).execute();

        const input: BookingDetailsInput = {
            user_id: user.id,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
        };

        const result = await getBookingDetails(input);

        expect(result).toHaveLength(1);
        expect(typeof result[0].total_hours).toBe('number');
        expect(result[0].total_hours).toEqual(7.25);
        expect(typeof result[0].entries[0].hours).toBe('number');
        expect(result[0].entries[0].hours).toEqual(7.25);
    });
});
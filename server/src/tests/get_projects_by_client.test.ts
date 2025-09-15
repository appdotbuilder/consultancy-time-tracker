import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, projectsTable } from '../db/schema';
import { type GetProjectsByClientInput } from '../handlers/get_projects_by_client';
import { getProjectsByClient } from '../handlers/get_projects_by_client';

describe('getProjectsByClient', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should fetch all projects for a specific client', async () => {
        // Create a test client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();

        const client = clientResult[0];

        // Create multiple projects for this client
        const projectsData = [
            {
                client_id: client.id,
                name: 'Project Alpha',
                description: 'First test project',
                budget: '50000.00',
                status: 'active' as const,
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            },
            {
                client_id: client.id,
                name: 'Project Beta',
                description: 'Second test project',
                budget: '75000.50',
                status: 'completed' as const,
                start_date: '2024-02-01',
                end_date: '2024-08-31'
            },
            {
                client_id: client.id,
                name: 'Project Gamma',
                description: 'Third test project',
                budget: null, // No budget set
                status: 'on_hold' as const,
                start_date: null,
                end_date: null
            }
        ];

        await db.insert(projectsTable)
            .values(projectsData)
            .execute();

        // Test the handler
        const input: GetProjectsByClientInput = {
            client_id: client.id
        };

        const result = await getProjectsByClient(input);

        // Verify all projects are returned
        expect(result).toHaveLength(3);

        // Verify project details
        const alphaProject = result.find(p => p.name === 'Project Alpha');
        expect(alphaProject).toBeDefined();
        expect(alphaProject?.client_id).toBe(client.id);
        expect(alphaProject?.description).toBe('First test project');
        expect(alphaProject?.budget).toBe(50000.00);
        expect(typeof alphaProject?.budget).toBe('number');
        expect(alphaProject?.status).toBe('active');

        const betaProject = result.find(p => p.name === 'Project Beta');
        expect(betaProject).toBeDefined();
        expect(betaProject?.budget).toBe(75000.50);
        expect(typeof betaProject?.budget).toBe('number');
        expect(betaProject?.status).toBe('completed');

        const gammaProject = result.find(p => p.name === 'Project Gamma');
        expect(gammaProject).toBeDefined();
        expect(gammaProject?.budget).toBeNull();
        expect(gammaProject?.status).toBe('on_hold');

        // Verify all projects belong to the correct client
        result.forEach(project => {
            expect(project.client_id).toBe(client.id);
            expect(project.id).toBeDefined();
            expect(project.created_at).toBeInstanceOf(Date);
            expect(project.updated_at).toBeInstanceOf(Date);
        });
    });

    it('should return empty array when client has no projects', async () => {
        // Create a client with no projects
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Empty Client',
                address: '456 Empty Street',
                industry: 'Finance'
            })
            .returning()
            .execute();

        const client = clientResult[0];

        const input: GetProjectsByClientInput = {
            client_id: client.id
        };

        const result = await getProjectsByClient(input);

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for non-existent client', async () => {
        const input: GetProjectsByClientInput = {
            client_id: 99999 // Non-existent client ID
        };

        const result = await getProjectsByClient(input);

        expect(result).toHaveLength(0);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should only return projects for the specified client', async () => {
        // Create two different clients
        const client1Result = await db.insert(clientsTable)
            .values({
                name: 'Client One',
                address: '111 First Street',
                industry: 'Healthcare'
            })
            .returning()
            .execute();

        const client2Result = await db.insert(clientsTable)
            .values({
                name: 'Client Two',
                address: '222 Second Street', 
                industry: 'Education'
            })
            .returning()
            .execute();

        const client1 = client1Result[0];
        const client2 = client2Result[0];

        // Create projects for both clients
        await db.insert(projectsTable)
            .values([
                {
                    client_id: client1.id,
                    name: 'Client 1 Project A',
                    description: 'Project for client 1',
                    budget: '25000.00',
                    status: 'active' as const
                },
                {
                    client_id: client1.id,
                    name: 'Client 1 Project B',
                    description: 'Another project for client 1',
                    budget: '35000.00',
                    status: 'completed' as const
                },
                {
                    client_id: client2.id,
                    name: 'Client 2 Project X',
                    description: 'Project for client 2',
                    budget: '45000.00',
                    status: 'active' as const
                }
            ])
            .execute();

        // Test fetching projects for client 1
        const input1: GetProjectsByClientInput = {
            client_id: client1.id
        };

        const result1 = await getProjectsByClient(input1);

        expect(result1).toHaveLength(2);
        result1.forEach(project => {
            expect(project.client_id).toBe(client1.id);
            expect(project.name).toMatch(/Client 1 Project/);
        });

        // Test fetching projects for client 2
        const input2: GetProjectsByClientInput = {
            client_id: client2.id
        };

        const result2 = await getProjectsByClient(input2);

        expect(result2).toHaveLength(1);
        expect(result2[0].client_id).toBe(client2.id);
        expect(result2[0].name).toBe('Client 2 Project X');
        expect(result2[0].budget).toBe(45000.00);
    });

    it('should handle projects with all possible statuses', async () => {
        // Create a test client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Status Test Client',
                address: '789 Status Street',
                industry: 'Manufacturing'
            })
            .returning()
            .execute();

        const client = clientResult[0];

        // Create projects with different statuses
        const projectsData = [
            {
                client_id: client.id,
                name: 'Active Project',
                status: 'active' as const,
                budget: '10000.00'
            },
            {
                client_id: client.id,
                name: 'Completed Project',
                status: 'completed' as const,
                budget: '20000.00'
            },
            {
                client_id: client.id,
                name: 'On Hold Project',
                status: 'on_hold' as const,
                budget: '30000.00'
            },
            {
                client_id: client.id,
                name: 'Cancelled Project',
                status: 'cancelled' as const,
                budget: '40000.00'
            }
        ];

        await db.insert(projectsTable)
            .values(projectsData)
            .execute();

        const input: GetProjectsByClientInput = {
            client_id: client.id
        };

        const result = await getProjectsByClient(input);

        expect(result).toHaveLength(4);

        const statuses = result.map(p => p.status);
        expect(statuses).toContain('active');
        expect(statuses).toContain('completed');
        expect(statuses).toContain('on_hold');
        expect(statuses).toContain('cancelled');

        // Verify all projects have correct numeric budget conversion
        result.forEach(project => {
            expect(typeof project.budget).toBe('number');
            expect(project.budget).toBeGreaterThan(0);
        });
    });
});
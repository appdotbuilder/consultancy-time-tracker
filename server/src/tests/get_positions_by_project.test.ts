import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { clientsTable, projectsTable, positionsTable } from '../db/schema';
import { getPositionsByProject, type GetPositionsByProjectInput } from '../handlers/get_positions_by_project';
import { eq } from 'drizzle-orm';

describe('getPositionsByProject', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return positions for a specific project', async () => {
        // Create prerequisite client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();
        const clientId = clientResult[0].id;

        // Create project
        const projectResult = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Test Project',
                description: 'A project for testing',
                budget: '10000.50',
                status: 'active',
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            })
            .returning()
            .execute();
        const projectId = projectResult[0].id;

        // Create positions for the project
        await db.insert(positionsTable)
            .values([
                {
                    project_id: projectId,
                    name: 'Senior Developer',
                    description: 'Lead development position',
                    budget: '5000.25',
                    hourly_rate: '125.75'
                },
                {
                    project_id: projectId,
                    name: 'Junior Developer',
                    description: 'Junior development position',
                    budget: '3000.50',
                    hourly_rate: '75.25'
                }
            ])
            .execute();

        // Test the handler
        const input: GetPositionsByProjectInput = { project_id: projectId };
        const result = await getPositionsByProject(input);

        expect(result).toHaveLength(2);

        // Verify first position
        const seniorDev = result.find(p => p.name === 'Senior Developer');
        expect(seniorDev).toBeDefined();
        expect(seniorDev!.name).toEqual('Senior Developer');
        expect(seniorDev!.description).toEqual('Lead development position');
        expect(seniorDev!.budget).toEqual(5000.25);
        expect(seniorDev!.hourly_rate).toEqual(125.75);
        expect(typeof seniorDev!.budget).toBe('number');
        expect(typeof seniorDev!.hourly_rate).toBe('number');
        expect(seniorDev!.project_id).toEqual(projectId);
        expect(seniorDev!.id).toBeDefined();
        expect(seniorDev!.created_at).toBeInstanceOf(Date);
        expect(seniorDev!.updated_at).toBeInstanceOf(Date);

        // Verify second position
        const juniorDev = result.find(p => p.name === 'Junior Developer');
        expect(juniorDev).toBeDefined();
        expect(juniorDev!.name).toEqual('Junior Developer');
        expect(juniorDev!.description).toEqual('Junior development position');
        expect(juniorDev!.budget).toEqual(3000.50);
        expect(juniorDev!.hourly_rate).toEqual(75.25);
        expect(typeof juniorDev!.budget).toBe('number');
        expect(typeof juniorDev!.hourly_rate).toBe('number');
        expect(juniorDev!.project_id).toEqual(projectId);
    });

    it('should return empty array for project with no positions', async () => {
        // Create prerequisite client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();
        const clientId = clientResult[0].id;

        // Create project without positions
        const projectResult = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Test Project',
                description: 'A project for testing',
                budget: '10000.50',
                status: 'active',
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            })
            .returning()
            .execute();
        const projectId = projectResult[0].id;

        // Test the handler
        const input: GetPositionsByProjectInput = { project_id: projectId };
        const result = await getPositionsByProject(input);

        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
    });

    it('should return empty array for non-existent project', async () => {
        const input: GetPositionsByProjectInput = { project_id: 999 };
        const result = await getPositionsByProject(input);

        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
    });

    it('should handle positions with null budget and hourly_rate', async () => {
        // Create prerequisite client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();
        const clientId = clientResult[0].id;

        // Create project
        const projectResult = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Test Project',
                description: 'A project for testing',
                budget: '10000.50',
                status: 'active',
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            })
            .returning()
            .execute();
        const projectId = projectResult[0].id;

        // Create position with null values
        await db.insert(positionsTable)
            .values({
                project_id: projectId,
                name: 'Test Position',
                description: 'Position with null values',
                budget: null,
                hourly_rate: null
            })
            .execute();

        // Test the handler
        const input: GetPositionsByProjectInput = { project_id: projectId };
        const result = await getPositionsByProject(input);

        expect(result).toHaveLength(1);
        expect(result[0].name).toEqual('Test Position');
        expect(result[0].budget).toBeNull();
        expect(result[0].hourly_rate).toBeNull();
    });

    it('should only return positions for specified project', async () => {
        // Create prerequisite client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();
        const clientId = clientResult[0].id;

        // Create two projects
        const project1Result = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Project 1',
                description: 'First project',
                budget: '10000.50',
                status: 'active',
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            })
            .returning()
            .execute();
        const project1Id = project1Result[0].id;

        const project2Result = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Project 2',
                description: 'Second project',
                budget: '15000.75',
                status: 'active',
                start_date: '2024-07-01',
                end_date: '2024-12-31'
            })
            .returning()
            .execute();
        const project2Id = project2Result[0].id;

        // Create positions for both projects
        await db.insert(positionsTable)
            .values([
                {
                    project_id: project1Id,
                    name: 'Project 1 Position',
                    description: 'Position for project 1',
                    budget: '1000.00',
                    hourly_rate: '100.00'
                },
                {
                    project_id: project2Id,
                    name: 'Project 2 Position',
                    description: 'Position for project 2',
                    budget: '2000.00',
                    hourly_rate: '200.00'
                }
            ])
            .execute();

        // Test handler for project 1
        const input1: GetPositionsByProjectInput = { project_id: project1Id };
        const result1 = await getPositionsByProject(input1);

        expect(result1).toHaveLength(1);
        expect(result1[0].name).toEqual('Project 1 Position');
        expect(result1[0].project_id).toEqual(project1Id);

        // Test handler for project 2
        const input2: GetPositionsByProjectInput = { project_id: project2Id };
        const result2 = await getPositionsByProject(input2);

        expect(result2).toHaveLength(1);
        expect(result2[0].name).toEqual('Project 2 Position');
        expect(result2[0].project_id).toEqual(project2Id);
    });

    it('should verify positions exist in database', async () => {
        // Create prerequisite client
        const clientResult = await db.insert(clientsTable)
            .values({
                name: 'Test Client',
                address: '123 Test Street',
                industry: 'Technology'
            })
            .returning()
            .execute();
        const clientId = clientResult[0].id;

        // Create project
        const projectResult = await db.insert(projectsTable)
            .values({
                client_id: clientId,
                name: 'Test Project',
                description: 'A project for testing',
                budget: '10000.50',
                status: 'active',
                start_date: '2024-01-01',
                end_date: '2024-06-30'
            })
            .returning()
            .execute();
        const projectId = projectResult[0].id;

        // Create position
        await db.insert(positionsTable)
            .values({
                project_id: projectId,
                name: 'Senior Developer',
                description: 'Lead development position',
                budget: '5000.25',
                hourly_rate: '125.75'
            })
            .execute();

        // Test the handler
        const input: GetPositionsByProjectInput = { project_id: projectId };
        const result = await getPositionsByProject(input);

        // Verify the position exists in database
        const dbPositions = await db.select()
            .from(positionsTable)
            .where(eq(positionsTable.project_id, projectId))
            .execute();

        expect(dbPositions).toHaveLength(1);
        expect(result).toHaveLength(1);
        expect(result[0].id).toEqual(dbPositions[0].id);
        expect(result[0].name).toEqual(dbPositions[0].name);
    });
});
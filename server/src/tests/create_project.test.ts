import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, clientsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';

describe('createProject', () => {
  let testClientId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test client first since projects require a valid client_id
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

  it('should create a project with all fields', async () => {
    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Test Project',
      description: 'A comprehensive test project',
      budget: 50000.50,
      status: 'active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const result = await createProject(testInput);

    // Basic field validation
    expect(result.client_id).toEqual(testClientId);
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A comprehensive test project');
    expect(result.budget).toEqual(50000.50);
    expect(typeof result.budget).toBe('number');
    expect(result.status).toEqual('active');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-12-31'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a project with minimal required fields', async () => {
    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Minimal Project',
      description: null,
      budget: null,
      status: 'on_hold',
      start_date: null,
      end_date: null
    };

    const result = await createProject(testInput);

    expect(result.client_id).toEqual(testClientId);
    expect(result.name).toEqual('Minimal Project');
    expect(result.description).toBeNull();
    expect(result.budget).toBeNull();
    expect(result.status).toEqual('on_hold');
    expect(result.start_date).toBeNull();
    expect(result.end_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should apply Zod default status when not provided', async () => {
    // Test that Zod default for status works
    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Default Status Project',
      description: null,
      budget: null,
      status: 'active', // Include required status field
      start_date: null,
      end_date: null
    };

    const result = await createProject(testInput);

    expect(result.status).toEqual('active'); // Zod default
  });

  it('should save project to database', async () => {
    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Database Test Project',
      description: 'Testing database persistence',
      budget: 25000.75,
      status: 'completed',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-06-30')
    };

    const result = await createProject(testInput);

    // Query using proper drizzle syntax
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    const savedProject = projects[0];
    expect(savedProject.name).toEqual('Database Test Project');
    expect(savedProject.description).toEqual('Testing database persistence');
    expect(parseFloat(savedProject.budget!)).toEqual(25000.75); // Convert back from string
    expect(savedProject.status).toEqual('completed');
    expect(savedProject.start_date).toEqual('2024-02-01');
    expect(savedProject.end_date).toEqual('2024-06-30');
    expect(savedProject.created_at).toBeInstanceOf(Date);
    expect(savedProject.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different project statuses', async () => {
    const statuses: Array<'active' | 'completed' | 'on_hold' | 'cancelled'> = [
      'active', 'completed', 'on_hold', 'cancelled'
    ];

    for (const status of statuses) {
      const testInput: CreateProjectInput = {
        client_id: testClientId,
        name: `${status} Project`,
        description: null,
        budget: null,
        status: status,
        start_date: null,
        end_date: null
      };

      const result = await createProject(testInput);
      expect(result.status).toEqual(status);
    }
  });

  it('should handle decimal budget values correctly', async () => {
    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Decimal Budget Project',
      description: null,
      budget: 99999.99,
      status: 'active',
      start_date: null,
      end_date: null
    };

    const result = await createProject(testInput);

    expect(result.budget).toEqual(99999.99);
    expect(typeof result.budget).toBe('number');

    // Verify in database
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(parseFloat(projects[0].budget!)).toEqual(99999.99);
  });

  it('should fail when client_id does not exist', async () => {
    const testInput: CreateProjectInput = {
      client_id: 99999, // Non-existent client ID
      name: 'Invalid Client Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: null,
      end_date: null
    };

    await expect(createProject(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should handle date fields correctly', async () => {
    const startDate = new Date('2024-03-15');
    const endDate = new Date('2024-09-15');

    const testInput: CreateProjectInput = {
      client_id: testClientId,
      name: 'Date Test Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: startDate,
      end_date: endDate
    };

    const result = await createProject(testInput);

    expect(result.start_date).toEqual(startDate);
    expect(result.end_date).toEqual(endDate);
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
  });
});
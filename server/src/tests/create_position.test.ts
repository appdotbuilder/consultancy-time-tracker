import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { positionsTable, projectsTable, clientsTable } from '../db/schema';
import { type CreatePositionInput } from '../schema';
import { createPosition } from '../handlers/create_position';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreatePositionInput = {
  project_id: 1,
  name: 'Senior Developer',
  description: 'Lead developer for the project',
  budget: 50000.00,
  hourly_rate: 150.00
};

// Test input with nullable fields
const minimalTestInput: CreatePositionInput = {
  project_id: 1,
  name: 'Junior Developer',
  description: null,
  budget: null,
  hourly_rate: null
};

describe('createPosition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a position with all fields', async () => {
    // Create prerequisite client and project
    await db.insert(clientsTable).values({
      name: 'Test Client',
      address: null,
      industry: null
    }).execute();

    await db.insert(projectsTable).values({
      client_id: 1,
      name: 'Test Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: null,
      end_date: null
    }).execute();

    const result = await createPosition(testInput);

    // Basic field validation
    expect(result.name).toEqual('Senior Developer');
    expect(result.description).toEqual('Lead developer for the project');
    expect(result.project_id).toEqual(1);
    expect(result.budget).toEqual(50000.00);
    expect(typeof result.budget).toBe('number');
    expect(result.hourly_rate).toEqual(150.00);
    expect(typeof result.hourly_rate).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a position with nullable fields', async () => {
    // Create prerequisite client and project
    await db.insert(clientsTable).values({
      name: 'Test Client',
      address: null,
      industry: null
    }).execute();

    await db.insert(projectsTable).values({
      client_id: 1,
      name: 'Test Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: null,
      end_date: null
    }).execute();

    const result = await createPosition(minimalTestInput);

    // Basic field validation
    expect(result.name).toEqual('Junior Developer');
    expect(result.description).toBeNull();
    expect(result.project_id).toEqual(1);
    expect(result.budget).toBeNull();
    expect(result.hourly_rate).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save position to database', async () => {
    // Create prerequisite client and project
    await db.insert(clientsTable).values({
      name: 'Test Client',
      address: null,
      industry: null
    }).execute();

    await db.insert(projectsTable).values({
      client_id: 1,
      name: 'Test Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: null,
      end_date: null
    }).execute();

    const result = await createPosition(testInput);

    // Query using proper drizzle syntax
    const positions = await db.select()
      .from(positionsTable)
      .where(eq(positionsTable.id, result.id))
      .execute();

    expect(positions).toHaveLength(1);
    expect(positions[0].name).toEqual('Senior Developer');
    expect(positions[0].description).toEqual('Lead developer for the project');
    expect(positions[0].project_id).toEqual(1);
    expect(parseFloat(positions[0].budget!)).toEqual(50000.00);
    expect(parseFloat(positions[0].hourly_rate!)).toEqual(150.00);
    expect(positions[0].created_at).toBeInstanceOf(Date);
    expect(positions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric conversion correctly', async () => {
    // Create prerequisite client and project
    await db.insert(clientsTable).values({
      name: 'Test Client',
      address: null,
      industry: null
    }).execute();

    await db.insert(projectsTable).values({
      client_id: 1,
      name: 'Test Project',
      description: null,
      budget: null,
      status: 'active',
      start_date: null,
      end_date: null
    }).execute();

    const inputWithDecimals: CreatePositionInput = {
      project_id: 1,
      name: 'Test Position',
      description: 'Test description',
      budget: 25000.50,
      hourly_rate: 125.75
    };

    const result = await createPosition(inputWithDecimals);

    // Verify numeric conversion
    expect(typeof result.budget).toBe('number');
    expect(typeof result.hourly_rate).toBe('number');
    expect(result.budget).toEqual(25000.50);
    expect(result.hourly_rate).toEqual(125.75);
  });

  it('should throw error for non-existent project', async () => {
    const inputWithInvalidProject: CreatePositionInput = {
      project_id: 999, // Non-existent project
      name: 'Test Position',
      description: null,
      budget: null,
      hourly_rate: null
    };

    await expect(createPosition(inputWithInvalidProject)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
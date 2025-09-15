import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with hourly rate
const testInputWithRate: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'consultant',
  hourly_rate: 75.50
};

// Test input without hourly rate
const testInputWithoutRate: CreateUserInput = {
  email: 'manager@example.com',
  name: 'Test Manager',
  role: 'project_manager',
  hourly_rate: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hourly rate', async () => {
    const result = await createUser(testInputWithRate);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('consultant');
    expect(result.hourly_rate).toEqual(75.50);
    expect(typeof result.hourly_rate).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user without hourly rate', async () => {
    const result = await createUser(testInputWithoutRate);

    // Basic field validation
    expect(result.email).toEqual('manager@example.com');
    expect(result.name).toEqual('Test Manager');
    expect(result.role).toEqual('project_manager');
    expect(result.hourly_rate).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database with correct data types', async () => {
    const result = await createUser(testInputWithRate);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.name).toEqual('Test User');
    expect(savedUser.role).toEqual('consultant');
    expect(savedUser.hourly_rate).toEqual('75.50'); // Stored as string in DB
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different user roles correctly', async () => {
    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'administrator',
      hourly_rate: null
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('administrator');
    expect(result.hourly_rate).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].role).toEqual('administrator');
  });

  it('should enforce email uniqueness constraint', async () => {
    // Create first user
    await createUser(testInputWithRate);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      name: 'Another User',
      role: 'project_manager',
      hourly_rate: 100.00
    };

    // Should throw error due to unique constraint
    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle numeric precision correctly', async () => {
    const precisionInput: CreateUserInput = {
      email: 'precision@example.com',
      name: 'Precision User',
      role: 'consultant',
      hourly_rate: 123.456789 // High precision number
    };

    const result = await createUser(precisionInput);

    // Should preserve precision as defined in schema (10,2)
    expect(result.hourly_rate).toEqual(123.46); // Rounded to 2 decimal places
    expect(typeof result.hourly_rate).toEqual('number');
  });
});
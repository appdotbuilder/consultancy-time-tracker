import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUser1: CreateUserInput = {
  email: 'consultant@example.com',
  name: 'John Consultant',
  role: 'consultant',
  hourly_rate: 75.50
};

const testUser2: CreateUserInput = {
  email: 'pm@example.com',
  name: 'Jane Manager',
  role: 'project_manager',
  hourly_rate: null
};

const testUser3: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'administrator',
  hourly_rate: 100.00
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users with correct field types', async () => {
    // Create test users
    await db.insert(usersTable)
      .values({
        email: testUser1.email,
        name: testUser1.name,
        role: testUser1.role,
        hourly_rate: testUser1.hourly_rate!.toString()
      })
      .execute();

    await db.insert(usersTable)
      .values({
        email: testUser2.email,
        name: testUser2.name,
        role: testUser2.role,
        hourly_rate: null
      })
      .execute();

    await db.insert(usersTable)
      .values({
        email: testUser3.email,
        name: testUser3.name,
        role: testUser3.role,
        hourly_rate: testUser3.hourly_rate!.toString()
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Check user with hourly_rate
    const consultant = result.find(u => u.email === 'consultant@example.com');
    expect(consultant).toBeDefined();
    expect(consultant!.name).toEqual('John Consultant');
    expect(consultant!.role).toEqual('consultant');
    expect(consultant!.hourly_rate).toEqual(75.50);
    expect(typeof consultant!.hourly_rate).toEqual('number');
    expect(consultant!.id).toBeDefined();
    expect(consultant!.created_at).toBeInstanceOf(Date);
    expect(consultant!.updated_at).toBeInstanceOf(Date);

    // Check user with null hourly_rate
    const pm = result.find(u => u.email === 'pm@example.com');
    expect(pm).toBeDefined();
    expect(pm!.name).toEqual('Jane Manager');
    expect(pm!.role).toEqual('project_manager');
    expect(pm!.hourly_rate).toBeNull();

    // Check admin user
    const admin = result.find(u => u.email === 'admin@example.com');
    expect(admin).toBeDefined();
    expect(admin!.name).toEqual('Admin User');
    expect(admin!.role).toEqual('administrator');
    expect(admin!.hourly_rate).toEqual(100.00);
    expect(typeof admin!.hourly_rate).toEqual('number');
  });

  it('should handle numeric conversion correctly', async () => {
    // Create user with specific hourly rate
    await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'consultant',
        hourly_rate: '123.45' // Insert as string
      })
      .execute();

    const result = await getUsers();
    
    expect(result).toHaveLength(1);
    const user = result[0];
    expect(user.hourly_rate).toEqual(123.45);
    expect(typeof user.hourly_rate).toEqual('number');
  });

  it('should return users in consistent order', async () => {
    // Create multiple users
    const userEmails = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
    
    for (const email of userEmails) {
      await db.insert(usersTable)
        .values({
          email,
          name: `User ${email}`,
          role: 'consultant',
          hourly_rate: '50.00'
        })
        .execute();
    }

    // Call getUsers multiple times to ensure consistent ordering
    const result1 = await getUsers();
    const result2 = await getUsers();
    
    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(3);
    
    // Results should maintain the same order (by id due to database ordering)
    expect(result1.map(u => u.email)).toEqual(result2.map(u => u.email));
  });

  it('should handle all user roles correctly', async () => {
    // Create users with different roles
    const roles = ['consultant', 'project_manager', 'administrator'] as const;
    
    for (const role of roles) {
      await db.insert(usersTable)
        .values({
          email: `${role}@test.com`,
          name: `Test ${role}`,
          role: role,
          hourly_rate: '75.00'
        })
        .execute();
    }

    const result = await getUsers();
    
    expect(result).toHaveLength(3);
    
    // Verify all roles are present
    const resultRoles = result.map(u => u.role).sort();
    expect(resultRoles).toEqual(['administrator', 'consultant', 'project_manager']);
  });
});
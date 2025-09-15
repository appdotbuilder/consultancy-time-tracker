import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  clientsTable, 
  projectsTable, 
  positionsTable, 
  usersTable, 
  timeEntriesTable 
} from '../db/schema';
import { type BudgetConsumptionInput } from '../schema';
import { getBudgetConsumption } from '../handlers/get_budget_consumption';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      name: 'Test Consultant',
      email: 'consultant@test.com',
      role: 'consultant',
      hourly_rate: '100.00'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestClient = async () => {
  const result = await db.insert(clientsTable)
    .values({
      name: 'Test Client',
      address: '123 Test St',
      industry: 'Technology'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestProject = async (clientId: number, budget?: string) => {
  const result = await db.insert(projectsTable)
    .values({
      client_id: clientId,
      name: 'Test Project',
      description: 'A project for testing',
      budget: budget,
      status: 'active'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestPosition = async (projectId: number, budget?: string, hourlyRate?: string | null) => {
  const values: any = {
    project_id: projectId,
    name: 'Test Position',
    description: 'A position for testing',
    budget: budget
  };
  
  if (hourlyRate !== null) {
    values.hourly_rate = hourlyRate || '100.00';
  }
  
  const result = await db.insert(positionsTable)
    .values(values)
    .returning()
    .execute();
  return result[0];
};

const createTestTimeEntry = async (userId: number, positionId: number, hours: string, date?: string) => {
  const result = await db.insert(timeEntriesTable)
    .values({
      user_id: userId,
      position_id: positionId,
      description: 'Test time entry',
      hours: hours,
      date: date || '2024-01-15',
      billable: true
    })
    .returning()
    .execute();
  return result[0];
};

describe('getBudgetConsumption', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('position-level consumption', () => {
    it('should calculate position budget consumption correctly', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id, '10000.00');
      const position = await createTestPosition(project.id, '5000.00', '100.00');
      
      // Create time entries: 20 hours at $100/hour = $2000 consumed
      await createTestTimeEntry(user.id, position.id, '10.00');
      await createTestTimeEntry(user.id, position.id, '10.00');

      const input: BudgetConsumptionInput = { position_id: position.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe('position');
      expect(result[0].entity_id).toBe(position.id);
      expect(result[0].entity_name).toBe('Test Position');
      expect(result[0].total_budget).toBe(5000);
      expect(result[0].consumed_amount).toBe(2000); // 20 hours * $100
      expect(result[0].consumption_rate).toBe(40); // 2000/5000 * 100
      expect(result[0].remaining_budget).toBe(3000); // 5000 - 2000
    });

    it('should handle position without budget', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const position = await createTestPosition(project.id, undefined, '100.00');
      
      await createTestTimeEntry(user.id, position.id, '10.00');

      const input: BudgetConsumptionInput = { position_id: position.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].total_budget).toBeNull();
      expect(result[0].consumed_amount).toBe(1000); // 10 hours * $100
      expect(result[0].consumption_rate).toBe(0);
      expect(result[0].remaining_budget).toBeNull();
    });

    it('should handle position without hourly rate', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const position = await createTestPosition(project.id, '5000.00', null);
      
      await createTestTimeEntry(user.id, position.id, '10.00');

      const input: BudgetConsumptionInput = { position_id: position.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].total_budget).toBe(5000);
      expect(result[0].consumed_amount).toBe(0); // No hourly rate
      expect(result[0].consumption_rate).toBe(0);
      expect(result[0].remaining_budget).toBe(5000);
    });

    it('should return empty array for non-existent position', async () => {
      const input: BudgetConsumptionInput = { position_id: 999 };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('project-level consumption', () => {
    it('should calculate project budget consumption across multiple positions', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id, '10000.00');
      
      // Create two positions with different hourly rates
      const position1 = await createTestPosition(project.id, '3000.00', '100.00');
      const position2 = await createTestPosition(project.id, '2000.00', '150.00');
      
      // Create time entries for both positions
      await createTestTimeEntry(user.id, position1.id, '10.00'); // $1000
      await createTestTimeEntry(user.id, position2.id, '8.00'); // $1200
      
      const input: BudgetConsumptionInput = { project_id: project.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe('project');
      expect(result[0].entity_id).toBe(project.id);
      expect(result[0].entity_name).toBe('Test Project');
      expect(result[0].total_budget).toBe(10000);
      expect(result[0].consumed_amount).toBe(2200); // $1000 + $1200
      expect(result[0].consumption_rate).toBe(22); // 2200/10000 * 100
      expect(result[0].remaining_budget).toBe(7800); // 10000 - 2200
    });

    it('should return empty array for non-existent project', async () => {
      const input: BudgetConsumptionInput = { project_id: 999 };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('client-level consumption', () => {
    it('should calculate client budget consumption across multiple projects', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      
      // Create two projects for the client
      const project1 = await createTestProject(client.id, '5000.00');
      const project2 = await createTestProject(client.id, '7000.00');
      
      // Create positions for each project
      const position1 = await createTestPosition(project1.id, '3000.00', '100.00');
      const position2 = await createTestPosition(project2.id, '4000.00', '120.00');
      
      // Create time entries
      await createTestTimeEntry(user.id, position1.id, '15.00'); // $1500
      await createTestTimeEntry(user.id, position2.id, '10.00'); // $1200
      
      const input: BudgetConsumptionInput = { client_id: client.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].entity_type).toBe('client');
      expect(result[0].entity_id).toBe(client.id);
      expect(result[0].entity_name).toBe('Test Client');
      expect(result[0].total_budget).toBe(12000); // $5000 + $7000
      expect(result[0].consumed_amount).toBe(2700); // $1500 + $1200
      expect(result[0].consumption_rate).toBe(22.5); // 2700/12000 * 100
      expect(result[0].remaining_budget).toBe(9300); // 12000 - 2700
    });

    it('should return empty array for non-existent client', async () => {
      const input: BudgetConsumptionInput = { client_id: 999 };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('all entities consumption', () => {
    it('should return consumption for all entities with budgets', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id, '10000.00');
      const position = await createTestPosition(project.id, '5000.00', '100.00');
      
      await createTestTimeEntry(user.id, position.id, '10.00');

      const input: BudgetConsumptionInput = {};
      const result = await getBudgetConsumption(input);

      // Should return client, project, and position reports
      expect(result.length).toBeGreaterThanOrEqual(3);
      
      const entityTypes = result.map(r => r.entity_type);
      expect(entityTypes).toContain('client');
      expect(entityTypes).toContain('project');
      expect(entityTypes).toContain('position');
    });

    it('should return empty array when no budgets exist', async () => {
      const input: BudgetConsumptionInput = {};
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero hours correctly', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id, '10000.00');
      const position = await createTestPosition(project.id, '5000.00', '100.00');
      
      // No time entries created

      const input: BudgetConsumptionInput = { position_id: position.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].consumed_amount).toBe(0);
      expect(result[0].consumption_rate).toBe(0);
      expect(result[0].remaining_budget).toBe(5000);
    });

    it('should handle consumption exceeding budget', async () => {
      const user = await createTestUser();
      const client = await createTestClient();
      const project = await createTestProject(client.id, '10000.00');
      const position = await createTestPosition(project.id, '1000.00', '100.00');
      
      // Create 20 hours of work at $100/hour = $2000 consumed, but budget is only $1000
      await createTestTimeEntry(user.id, position.id, '20.00');

      const input: BudgetConsumptionInput = { position_id: position.id };
      const result = await getBudgetConsumption(input);

      expect(result).toHaveLength(1);
      expect(result[0].consumed_amount).toBe(2000);
      expect(result[0].consumption_rate).toBe(200); // 200% over budget
      expect(result[0].remaining_budget).toBe(-1000); // Negative remaining budget
    });
  });
});
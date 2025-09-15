import { db } from '../db';
import { 
  clientsTable, 
  projectsTable, 
  positionsTable, 
  timeEntriesTable, 
  usersTable 
} from '../db/schema';
import { type BudgetConsumptionInput } from '../schema';
import { z } from 'zod';
import { eq, and, isNotNull, sum, SQL } from 'drizzle-orm';

// Budget consumption report response type
export const budgetConsumptionReportSchema = z.object({
    entity_type: z.enum(['client', 'project', 'position']),
    entity_id: z.number(),
    entity_name: z.string(),
    total_budget: z.number().nullable(),
    consumed_amount: z.number(),
    consumption_rate: z.number(), // Percentage
    remaining_budget: z.number().nullable()
});

export type BudgetConsumptionReport = z.infer<typeof budgetConsumptionReportSchema>;

export const getBudgetConsumption = async (input: BudgetConsumptionInput): Promise<BudgetConsumptionReport[]> => {
  try {
    const reports: BudgetConsumptionReport[] = [];

    // If position_id is specified, get position-level consumption
    if (input.position_id) {
      const positionReport = await getPositionConsumption(input.position_id);
      if (positionReport) {
        reports.push(positionReport);
      }
    }
    // If project_id is specified, get project-level consumption
    else if (input.project_id) {
      const projectReport = await getProjectConsumption(input.project_id);
      if (projectReport) {
        reports.push(projectReport);
      }
    }
    // If client_id is specified, get client-level consumption
    else if (input.client_id) {
      const clientReport = await getClientConsumption(input.client_id);
      if (clientReport) {
        reports.push(clientReport);
      }
    }
    // If no specific filter, get all entities with budgets
    else {
      const allReports = await getAllBudgetConsumption();
      reports.push(...allReports);
    }

    return reports;
  } catch (error) {
    console.error('Budget consumption calculation failed:', error);
    throw error;
  }
};

async function getPositionConsumption(positionId: number): Promise<BudgetConsumptionReport | null> {
  // Get position details with consumed amount
  const result = await db
    .select({
      id: positionsTable.id,
      name: positionsTable.name,
      budget: positionsTable.budget,
      hourly_rate: positionsTable.hourly_rate,
      total_hours: sum(timeEntriesTable.hours),
    })
    .from(positionsTable)
    .leftJoin(timeEntriesTable, eq(positionsTable.id, timeEntriesTable.position_id))
    .where(eq(positionsTable.id, positionId))
    .groupBy(positionsTable.id, positionsTable.name, positionsTable.budget, positionsTable.hourly_rate)
    .execute();

  if (result.length === 0) return null;

  const position = result[0];
  const totalBudget = position.budget ? parseFloat(position.budget) : null;
  const hourlyRate = position.hourly_rate ? parseFloat(position.hourly_rate) : null;
  const totalHours = position.total_hours ? parseFloat(position.total_hours) : 0;
  
  // Calculate consumed amount based on hourly rate if available
  let consumedAmount = 0;
  if (hourlyRate && totalHours > 0) {
    consumedAmount = hourlyRate * totalHours;
  }

  const consumptionRate = totalBudget && totalBudget > 0 ? (consumedAmount / totalBudget) * 100 : 0;
  const remainingBudget = totalBudget ? totalBudget - consumedAmount : null;

  return {
    entity_type: 'position',
    entity_id: position.id,
    entity_name: position.name,
    total_budget: totalBudget,
    consumed_amount: consumedAmount,
    consumption_rate: consumptionRate,
    remaining_budget: remainingBudget
  };
}

async function getProjectConsumption(projectId: number): Promise<BudgetConsumptionReport | null> {
  // Get project details
  const projectResult = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      budget: projectsTable.budget
    })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .execute();

  if (projectResult.length === 0) return null;

  const project = projectResult[0];
  const totalBudget = project.budget ? parseFloat(project.budget) : null;

  // Calculate consumed amount across all positions in this project
  const consumptionResult = await db
    .select({
      total_hours: sum(timeEntriesTable.hours),
      position_hourly_rate: positionsTable.hourly_rate
    })
    .from(timeEntriesTable)
    .innerJoin(positionsTable, eq(timeEntriesTable.position_id, positionsTable.id))
    .where(eq(positionsTable.project_id, projectId))
    .groupBy(positionsTable.id, positionsTable.hourly_rate)
    .execute();

  let consumedAmount = 0;
  for (const consumption of consumptionResult) {
    const hours = consumption.total_hours ? parseFloat(consumption.total_hours) : 0;
    const rate = consumption.position_hourly_rate ? parseFloat(consumption.position_hourly_rate) : 0;
    consumedAmount += hours * rate;
  }

  const consumptionRate = totalBudget && totalBudget > 0 ? (consumedAmount / totalBudget) * 100 : 0;
  const remainingBudget = totalBudget ? totalBudget - consumedAmount : null;

  return {
    entity_type: 'project',
    entity_id: project.id,
    entity_name: project.name,
    total_budget: totalBudget,
    consumed_amount: consumedAmount,
    consumption_rate: consumptionRate,
    remaining_budget: remainingBudget
  };
}

async function getClientConsumption(clientId: number): Promise<BudgetConsumptionReport | null> {
  // Get client details
  const clientResult = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name
    })
    .from(clientsTable)
    .where(eq(clientsTable.id, clientId))
    .execute();

  if (clientResult.length === 0) return null;

  const client = clientResult[0];

  // Calculate total budget across all projects for this client
  const budgetResult = await db
    .select({
      total_budget: sum(projectsTable.budget)
    })
    .from(projectsTable)
    .where(eq(projectsTable.client_id, clientId))
    .execute();

  const totalBudget = budgetResult[0]?.total_budget ? parseFloat(budgetResult[0].total_budget) : null;

  // Calculate consumed amount across all positions in all projects for this client
  const consumptionResult = await db
    .select({
      total_hours: sum(timeEntriesTable.hours),
      position_hourly_rate: positionsTable.hourly_rate
    })
    .from(timeEntriesTable)
    .innerJoin(positionsTable, eq(timeEntriesTable.position_id, positionsTable.id))
    .innerJoin(projectsTable, eq(positionsTable.project_id, projectsTable.id))
    .where(eq(projectsTable.client_id, clientId))
    .groupBy(positionsTable.id, positionsTable.hourly_rate)
    .execute();

  let consumedAmount = 0;
  for (const consumption of consumptionResult) {
    const hours = consumption.total_hours ? parseFloat(consumption.total_hours) : 0;
    const rate = consumption.position_hourly_rate ? parseFloat(consumption.position_hourly_rate) : 0;
    consumedAmount += hours * rate;
  }

  const consumptionRate = totalBudget && totalBudget > 0 ? (consumedAmount / totalBudget) * 100 : 0;
  const remainingBudget = totalBudget ? totalBudget - consumedAmount : null;

  return {
    entity_type: 'client',
    entity_id: client.id,
    entity_name: client.name,
    total_budget: totalBudget,
    consumed_amount: consumedAmount,
    consumption_rate: consumptionRate,
    remaining_budget: remainingBudget
  };
}

async function getAllBudgetConsumption(): Promise<BudgetConsumptionReport[]> {
  const reports: BudgetConsumptionReport[] = [];

  // Get all clients with projects that have budgets
  const clientsWithBudgets = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name
    })
    .from(clientsTable)
    .innerJoin(projectsTable, eq(clientsTable.id, projectsTable.client_id))
    .where(isNotNull(projectsTable.budget))
    .groupBy(clientsTable.id, clientsTable.name)
    .execute();

  for (const client of clientsWithBudgets) {
    const clientReport = await getClientConsumption(client.id);
    if (clientReport) {
      reports.push(clientReport);
    }
  }

  // Get all projects with budgets
  const projectsWithBudgets = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name
    })
    .from(projectsTable)
    .where(isNotNull(projectsTable.budget))
    .execute();

  for (const project of projectsWithBudgets) {
    const projectReport = await getProjectConsumption(project.id);
    if (projectReport) {
      reports.push(projectReport);
    }
  }

  // Get all positions with budgets
  const positionsWithBudgets = await db
    .select({
      id: positionsTable.id,
      name: positionsTable.name
    })
    .from(positionsTable)
    .where(isNotNull(positionsTable.budget))
    .execute();

  for (const position of positionsWithBudgets) {
    const positionReport = await getPositionConsumption(position.id);
    if (positionReport) {
      reports.push(positionReport);
    }
  }

  return reports;
}
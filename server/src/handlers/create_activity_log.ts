import { db } from '../db';
import { activityLogsTable } from '../db/schema';
import { type CreateActivityLogInput, type ActivityLog } from '../schema';

export const createActivityLog = async (input: CreateActivityLogInput): Promise<ActivityLog> => {
  try {
    // Insert activity log record
    const result = await db.insert(activityLogsTable)
      .values({
        client_id: input.client_id,
        user_id: input.user_id,
        activity_type: input.activity_type,
        description: input.description,
        activity_date: input.activity_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Return the created activity log with proper date conversion
    const activityLog = result[0];
    return {
      ...activityLog,
      activity_date: new Date(activityLog.activity_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Activity log creation failed:', error);
    throw error;
  }
};
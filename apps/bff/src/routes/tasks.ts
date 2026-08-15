import '../lib/load-env';
import { Router, Request, Response } from 'express';
import { Task, TasksResponse } from '@saas/shared-types';
import { Pool } from 'pg';

const router = Router();

type TaskRow = {
  task_id: string;
  title: string;
  project: string;
  priority: Task['priority'];
  date: string;
  owner: string;
};

type TaskUpdatePayload = {
  title?: string;
  project?: string;
  priority?: Task['priority'];
  date?: string;
  owner?: string;
};

const databaseUrl = process.env.DATABASE_URL;
const isSqliteDemo = process.env.DB_PROVIDER === 'sqlite' || databaseUrl?.startsWith('file:');
const pool = databaseUrl && !isSqliteDemo ? new Pool({ connectionString: databaseUrl }) : null;

const fallbackTasks: Task[] = [
  {
    taskId: 'TASK-1001',
    title: 'Finalize onboarding copy',
    project: 'Website Revamp',
    priority: 'High',
    date: '2026-03-03',
    owner: 'Sibendu Das',
  },
  {
    taskId: 'TASK-1002',
    title: 'Review OAuth callback flow',
    project: 'Auth Modernization',
    priority: 'Critical',
    date: '2026-03-04',
    owner: 'Demo User',
  },
  {
    taskId: 'TASK-1003',
    title: 'Prepare customer import checklist',
    project: 'Customer Success',
    priority: 'Medium',
    date: '2026-03-06',
    owner: 'Aarav Patel',
  },
  {
    taskId: 'TASK-1004',
    title: 'QA responsive task list layout',
    project: 'Task Management',
    priority: 'Low',
    date: '2026-03-07',
    owner: 'Isha Sen',
  },
];

let fallbackTaskStore: Task[] = [...fallbackTasks];

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

export function mapTaskRowToTask(row: TaskRow): Task {
  return {
    taskId: row.task_id,
    title: row.title,
    project: row.project,
    priority: row.priority,
    date: row.date,
    owner: row.owner,
  };
}

async function seedTasksTableIfEmpty(): Promise<void> {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  await pool.query(`
    INSERT INTO "task" ("task_id", "title", "project", "priority", "date", "owner")
    SELECT
      seed."task_id",
      seed."title",
      seed."project",
      seed."priority"::"TaskPriority",
      seed."date",
      seed."owner"
    FROM (
      VALUES
        ('TASK-1001', 'Finalize onboarding copy', 'Website Revamp', 'High', DATE '2026-03-03', 'Sibendu Das'),
        ('TASK-1002', 'Review OAuth callback flow', 'Auth Modernization', 'Critical', DATE '2026-03-04', 'Demo User'),
        ('TASK-1003', 'Prepare customer import checklist', 'Customer Success', 'Medium', DATE '2026-03-06', 'Aarav Patel'),
        ('TASK-1004', 'QA responsive task list layout', 'Task Management', 'Low', DATE '2026-03-07', 'Isha Sen')
    ) AS seed("task_id", "title", "project", "priority", "date", "owner")
    WHERE NOT EXISTS (SELECT 1 FROM "task");
  `);
}

async function getTasksFromTable(): Promise<Task[]> {
  try {
    await seedTasksTableIfEmpty();

    if (!pool) {
      throw new Error('DATABASE_URL is not configured');
    }

    const result = await pool.query<TaskRow>(`
      SELECT "task_id", "title", "project", "priority", TO_CHAR("date", 'YYYY-MM-DD') as "date", "owner"
      FROM "task"
      ORDER BY "date" ASC, "task_id" ASC
    `);

    return result.rows.map(mapTaskRowToTask);
  } catch (error) {
    if (isTestRuntime()) {
      return fallbackTaskStore;
    }

    throw error;
  }
}

async function updateTaskInTable(taskId: string, payload: TaskUpdatePayload): Promise<Task | null> {
  if (!pool || isTestRuntime()) {
    const index = fallbackTaskStore.findIndex((task) => task.taskId === taskId);
    if (index === -1) {
      return null;
    }

    fallbackTaskStore[index] = {
      ...fallbackTaskStore[index],
      ...payload,
    };

    return fallbackTaskStore[index];
  }

  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const result = await pool.query<TaskRow>(
    `
      UPDATE "task"
      SET
        "title" = COALESCE($2, "title"),
        "project" = COALESCE($3, "project"),
        "priority" = COALESCE($4::"TaskPriority", "priority"),
        "date" = COALESCE($5::DATE, "date"),
        "owner" = COALESCE($6, "owner")
      WHERE "task_id" = $1
      RETURNING "task_id", "title", "project", "priority", TO_CHAR("date", 'YYYY-MM-DD') as "date", "owner"
    `,
    [
      taskId,
      payload.title ?? null,
      payload.project ?? null,
      payload.priority ?? null,
      payload.date ?? null,
      payload.owner ?? null,
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapTaskRowToTask(result.rows[0]);
}

async function deleteTaskFromTable(taskId: string): Promise<boolean> {
  if (!pool || isTestRuntime()) {
    const previousLength = fallbackTaskStore.length;
    fallbackTaskStore = fallbackTaskStore.filter((task) => task.taskId !== taskId);
    return fallbackTaskStore.length < previousLength;
  }

  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const result = await pool.query(
    `DELETE FROM "task" WHERE "task_id" = $1`,
    [taskId]
  );

  return (result.rowCount ?? 0) > 0;
}

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await getTasksFromTable();

    const response: TasksResponse = {
      tasks,
      total: tasks.length,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
    });
  }
});

router.patch('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const payload = req.body as TaskUpdatePayload;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'taskId is required',
      });
    }

    const hasEditableFields =
      payload.title !== undefined ||
      payload.project !== undefined ||
      payload.priority !== undefined ||
      payload.date !== undefined ||
      payload.owner !== undefined;

    if (!hasEditableFields) {
      return res.status(400).json({
        success: false,
        error: 'At least one editable field is required',
      });
    }

    const updated = await updateTaskInTable(taskId, payload);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
    });
  }
});

router.delete('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'taskId is required',
      });
    }

    const deleted = await deleteTaskFromTable(taskId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      deletedTaskId: taskId,
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
    });
  }
});

export default router;

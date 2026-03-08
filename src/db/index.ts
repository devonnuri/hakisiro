import Dexie, { type Table } from 'dexie';
import type {
  TreeNode,
  Task,
  TaskPrereq,
  TodayItem,
  LogEntry,
  DailyStats,
  DailyMemo,
  Meta
} from '../types/db';

export class HakisiroDB extends Dexie {
  nodes!: Table<TreeNode>;
  tasks!: Table<Task>;
  taskPrereqs!: Table<TaskPrereq>;
  todayItems!: Table<TodayItem>;
  logEntries!: Table<LogEntry>;
  dailyStats!: Table<DailyStats>;
  dailyMemos!: Table<DailyMemo>;
  meta!: Table<Meta>;

  constructor() {
    super('HakisiroDB');

    this.version(1).stores({
      nodes: 'id, parentId, [parentId+order], &code',
      tasks: 'id, nodeId, isDone, isArchived, [nodeId+isDone]',
      taskPrereqs: '++id, taskId, prereqTaskId, [taskId+prereqTaskId]',
      todayItems: '++id, date, taskId, [date+order], [date+taskId]',
      logEntries: 'id, date, taskId, [date+taskId], updatedAt',
      dailyStats: 'date, updatedAt',
      meta: 'key'
    });

    // Migration to v2: replace isDone/isArchived with progress
    this.version(2)
      .stores({
        tasks: 'id, nodeId, progress, [nodeId+progress]'
      })
      .upgrade(async (tx) => {
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: any) => {
            task.progress = task.isDone ? 1.0 : 0.0;
            delete task.isDone;
            delete task.isArchived;
          });
      });

    // Migration to v3: add completionDate index
    this.version(3)
      .stores({
        tasks: 'id, nodeId, progress, completionDate, [nodeId+progress]'
      })
      .upgrade(async (tx) => {
        const today = new Date().toISOString().split('T')[0];
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: any) => {
            if (task.progress >= 1.0 && !task.completionDate) {
              task.completionDate = today;
            }
          });
      });

    // Migration to v4: progress to Int (0-10) and logEntries weight to Int
    this.version(4)
      .stores({
        tasks: 'id, nodeId, progress, completionDate, [nodeId+progress]',
        logEntries: 'id, date, taskId, [date+taskId], updatedAt'
      })
      .upgrade(async (tx) => {
        await tx
          .table('tasks')
          .toCollection()
          .modify((task: any) => {
            if (task.progress <= 1.0) {
              task.progress = Math.round(task.progress * 10);
            }
          });

        await tx
          .table('logEntries')
          .toCollection()
          .modify((entry: any) => {
            if (entry.weight % 1 !== 0 || entry.weight <= 1.0) {
              if (Math.abs(entry.weight) <= 2.0) {
                entry.weight = Math.round(entry.weight * 10);
              }
            }
          });
      });

    // Migration to v5: Add 'order' to tasks
    this.version(5)
      .stores({
        tasks: 'id, nodeId, progress, completionDate, order, [nodeId+progress], [nodeId+order]'
      })
      .upgrade(async (tx) => {
        const tasks = await tx.table('tasks').toArray();
        const byNode: Record<string, any[]> = {};

        for (const t of tasks) {
          if (!byNode[t.nodeId]) byNode[t.nodeId] = [];
          byNode[t.nodeId].push(t);
        }

        for (const nodeId in byNode) {
          const nodeTasks = byNode[nodeId].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          for (let i = 0; i < nodeTasks.length; i++) {
            await tx.table('tasks').update(nodeTasks[i].id, { order: i });
          }
        }
      });

    // Migration to v6: add dailyMemos table for per-day notes
    this.version(6).stores({
      nodes: 'id, parentId, [parentId+order], &code',
      tasks: 'id, nodeId, progress, completionDate, order, [nodeId+progress], [nodeId+order]',
      taskPrereqs: '++id, taskId, prereqTaskId, [taskId+prereqTaskId]',
      todayItems: '++id, date, taskId, [date+order], [date+taskId]',
      logEntries: 'id, date, taskId, [date+taskId], updatedAt',
      dailyStats: 'date, updatedAt',
      dailyMemos: 'date',
      meta: 'key'
    });
  }
}

export const db = new HakisiroDB();

export async function initializeDatabase() {
  const { LedgerService } = await import('../services/LedgerService');
  await LedgerService.ensureDailyStatsContinuity();
}

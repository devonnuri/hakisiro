import Dexie, { type Table } from 'dexie';
import type { TreeNode, Task, TaskPrereq, TodayItem, LogEntry, DailyStats, Meta } from '../types/db';

export class HakisiroDB extends Dexie {
    nodes!: Table<TreeNode>;
    tasks!: Table<Task>;
    taskPrereqs!: Table<TaskPrereq>;
    todayItems!: Table<TodayItem>;
    logEntries!: Table<LogEntry>;
    dailyStats!: Table<DailyStats>;
    meta!: Table<Meta>;

    constructor() {
        super('HakisiroDB');

        // Schema definition
        this.version(1).stores({
            nodes: 'id, parentId, [parentId+order], &code', // &code for uniqueness
            tasks: 'id, nodeId, isDone, isArchived, [nodeId+isDone]',
            taskPrereqs: '++id, taskId, prereqTaskId, [taskId+prereqTaskId]',
            todayItems: '++id, date, taskId, [date+order], [date+taskId]',
            logEntries: 'id, date, taskId, [date+taskId], updatedAt',
            dailyStats: 'date, updatedAt',
            meta: 'key'
        });

        // Migration to v2: replace isDone/isArchived with progress
        this.version(2).stores({
            tasks: 'id, nodeId, progress, [nodeId+progress]' // dropped isDone, isArchived
        }).upgrade(async tx => {
            // Migrate existing tasks
            await tx.table('tasks').toCollection().modify((task: any) => {
                if (task.isDone) {
                    task.progress = 1.0;
                } else {
                    task.progress = 0.0;
                }
                // Determine if we should delete old fields? Dexie modify keeps them unless "delete prop".
                delete task.isDone;
                delete task.isArchived;
            });
        });

        // Migration to v3: add completionDate index
        this.version(3).stores({
            tasks: 'id, nodeId, progress, completionDate, [nodeId+progress]'
        }).upgrade(async tx => {
            // Populate completionDate for existing completed tasks
            const today = new Date().toISOString().split('T')[0];
            await tx.table('tasks').toCollection().modify((task: any) => {
                if (task.progress >= 1.0 && !task.completionDate) {
                    // We don't know when it was completed, default to today or leave null?
                    // User requirement: "Earned is sum of credits of tasks whose progress is 1.0".
                    // If we want them to show up in Stats, they need a completionDate.
                    // Let's assume today for migration to be safe, or maybe updatedAt?
                    // Safe bet: null, so they don't mess up historical stats, 
                    // BUT they won't show as Earned anywhere. 
                    // Let's set to today so they count for *something*.
                    task.completionDate = today;
                }
            });
        });
    }
}

export const db = new HakisiroDB();

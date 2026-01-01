import Dexie, { type Table } from 'dexie';
import type {
    TreeNode,
    Task,
    TaskPrereq,
    TodayItem,
    LogEntry,
    DailyStats,
    Meta
} from '../types/db';

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
        this.version(2)
            .stores({
                tasks: 'id, nodeId, progress, [nodeId+progress]' // dropped isDone, isArchived
            })
            .upgrade(async (tx) => {
                // Migrate existing tasks
                await tx
                    .table('tasks')
                    .toCollection()
                    .modify((task: any) => {
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
        this.version(3)
            .stores({
                tasks: 'id, nodeId, progress, completionDate, [nodeId+progress]'
            })
            .upgrade(async (tx) => {
                // Populate completionDate for existing completed tasks
                const today = new Date().toISOString().split('T')[0];
                await tx
                    .table('tasks')
                    .toCollection()
                    .modify((task: any) => {
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

        // Migration to v4: progress to Int (0-10) and logEntries weight to Int
        this.version(4).stores({
            tasks: 'id, nodeId, progress, completionDate, [nodeId+progress]',
            logEntries: 'id, date, taskId, [date+taskId], updatedAt' // Schema didn't change, but data needs migration
        }).upgrade(async tx => {
            // Migrate Task float (0.0-1.0) to int (0-10)
            await tx.table('tasks').toCollection().modify((task: any) => {
                if (task.progress <= 1.0) {
                    task.progress = Math.round(task.progress * 10);
                }
            });

            // Migrate LogEntry weight float (0.0-1.0+) to int (0-10+)
            await tx.table('logEntries').toCollection().modify((entry: any) => {
                // Check if float?
                if (entry.weight % 1 !== 0 || entry.weight <= 1.0) { // heuristic?
                    // If it was already int (e.g. 1.0), it becomes 10.
                    // If it was 0.5, becomes 5.
                    // If it was 0, becomes 0.
                    // If it was 5 (unlikely unless already migrated?), 50?
                    // Safest check: is it small?
                    if (Math.abs(entry.weight) <= 2.0) { // assuming daily progress <= 2.0 (200%)
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
            .upgrade(async tx => {
                // Populate order based on createdAt or just index
                const tasks = await tx.table('tasks').toArray();
                // Group by nodeId to order reasonably
                const byNode: Record<string, any[]> = {};
                for (const t of tasks) {
                    if (!byNode[t.nodeId]) byNode[t.nodeId] = [];
                    byNode[t.nodeId].push(t);
                }

                for (const nodeId in byNode) {
                    // Sort by createdAt
                    const nodeTasks = byNode[nodeId].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                    for (let i = 0; i < nodeTasks.length; i++) {
                        // Update order
                        await tx.table('tasks').update(nodeTasks[i].id, { order: i });
                    }
                }
            });
    }
}

export const db = new HakisiroDB();

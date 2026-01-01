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
    }
}

export const db = new HakisiroDB();

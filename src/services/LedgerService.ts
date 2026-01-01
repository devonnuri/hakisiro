import { db } from '../db';
import type { DailyStats, LogEntry, Task } from '../types/db';

export const LedgerService = {
    async upsertLog(date: string, taskId: string, weight: number): Promise<void> {
        // Quantize weight to 1 decimal
        const qWeight = Math.round(weight * 10) / 10;

        // Upsert logic: find existing by [date+taskId] or just put.
        // Dexie 'put' works if we have the PK.
        // PK is 'id'. We need to query if existence to keep ID stable or generate new one.
        // Or we can generate id deterministically = `${date}:${taskId}`

        const id = `${date}:${taskId}`;

        await db.logEntries.put({
            id,
            date,
            taskId,
            weight: qWeight,
            updatedAt: Date.now()
        });

        // Trigger recompute
        await this.recomputeDailyStats(date);
    },

    async recomputeDailyStats(date: string): Promise<void> {
        const logs = await db.logEntries.where('date').equals(date).toArray();
        if (logs.length === 0) {
            // Clear stats if no logs
            await db.dailyStats.delete(date);
            return;
        }

        const taskIds = logs.map(l => l.taskId);
        const tasks = await db.tasks.bulkGet(taskIds);
        // filter undefineds if task deleted
        const validTasks = tasks.filter((t): t is Task => !!t);
        const taskMap = new Map(validTasks.map(t => [t.id, t]));

        let A = 0;
        let E = 0;
        const byNodeA: Record<string, number> = {};
        const byNodeE: Record<string, number> = {};

        // Helper to add to map
        const addFn = (map: Record<string, number>, key: string, val: number) => {
            map[key] = (map[key] || 0) + val;
        };

        // We need node hierarchy to roll up
        const allNodes = await db.nodes.toArray();
        const nodeMap = new Map(allNodes.map(n => [n.id, n]));

        for (const log of logs) {
            const task = taskMap.get(log.taskId);
            if (!task) continue;

            const credit = task.credit;
            const weight = log.weight;

            const valA = credit * weight;
            const valE = (weight === 1.0) ? credit : 0;

            A += valA;
            E += valE;

            // Roll up
            let nodeId: string | null = task.nodeId;
            while (nodeId) {
                addFn(byNodeA, nodeId, valA);
                addFn(byNodeE, nodeId, valE);

                const node = nodeMap.get(nodeId);
                nodeId = node && node.parentId ? node.parentId : null;
            }
        }

        const stats: DailyStats = {
            date,
            A,
            E,
            byNodeA,
            byNodeE,
            updatedAt: Date.now()
        };

        await db.dailyStats.put(stats);
    },

    async getDailyStats(date: string): Promise<DailyStats | undefined> {
        return await db.dailyStats.get(date);
    },

    async getLogsForDate(date: string): Promise<LogEntry[]> {
        return await db.logEntries.where('date').equals(date).toArray();
    }
};

import { db } from '../db';
import type { DailyStats, LogEntry, Task } from '../types/db';

export const LedgerService = {
    // New method: logProgress
    // This records the *change* in progress to activity.
    // However, the Ledger model (LogEntries) stores "weight" which was used for Today items.
    // The requirement says: "Each task progress is preserved after the day is passed. The progress delta should be applied to the activity"
    // This implies we need to record "how much progress was made today".
    // 
    // If I move from 0.0 -> 0.5 today: Activity += 0.5 * Credit.
    // If tomorrow I move 0.5 -> 0.8: Activity += 0.3 * Credit.
    // 
    // Problem: `LogEntry` currently stores `weight`. 
    // Do we keep LogEntry structure?
    // If we want to reconstruct history, `LogEntry` should probably store "delta achieved this day" or "new progress state"?
    // If we store "delta", simple sum = total activity.
    // If we store "absolute progress at end of day", delta = daily_val - prev_day_val.
    // 
    // Let's stick to "LogEntry tracks what happened today".
    // Maybe `LogEntry.weight` represents "Delta Progress made on this date".
    // And we can have multiple entries per task per day? Or just one aggregated?
    // Aggregated is cleaner.
    // 
    // Flow: 
    // 1. User changes progress 0.2 -> 0.5. Delta = 0.3.
    // 2. We update Task.progress to 0.5.
    // 3. We find today's LogEntry for this task.
    //    If exists, we add 0.3 to its weight (accumulated delta).
    //    If not, create with weight 0.3.
    // 
    // Wait, what if user corrects mistake? 0.5 -> 0.2. Delta = -0.3.
    // Activity should decrease.
    // 
    // So `LogEntry.weight` = "Sum of progress deltas for this task on this day".
    // 

    async logProgressDelta(date: string, taskId: string, delta: number): Promise<void> {
        const id = `${date}:${taskId}`;

        await db.transaction('rw', db.logEntries, db.dailyStats, async () => {
            const entry = await db.logEntries.get(id);
            const currentWeight = entry ? entry.weight : 0;
            const newWeight = currentWeight + delta;

            // Should we prune 0 deltas? Maybe not, to show interaction? 
            // If newWeight is 0, it means net zero change today. 

            await db.logEntries.put({
                id,
                date,
                taskId,
                weight: newWeight,
                updatedAt: Date.now()
            });
        });

        await this.recomputeDailyStats(date);
    },

    // Deprecated upsertLog in favor of delta approach
    // But keeping signature for compatibility if needed, or removing?
    // Let's remove/replace.


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

            const valA = credit * weight; // weight is delta progress

            A += valA;
            // E is calculated separately below based on Task completionDate

            // Roll up A
            let nodeId: string | null = task.nodeId;
            while (nodeId) {
                addFn(byNodeA, nodeId, valA);
                const node = nodeMap.get(nodeId);
                nodeId = node && node.parentId ? node.parentId : null;
            }
        }

        // Calculate E: Sum credits of tasks completed on this date
        // Query tasks where completionDate == date
        const completedTasks = await db.tasks.where('completionDate').equals(date).toArray();

        for (const t of completedTasks) {
            // "Earned is the sum of the credits of tasks whose progress is 1.0"
            // Note: DB query 'completionDate' equals date. 
            // We should also verify progress is 1.0 just in case (though logic should ensure it).
            if (t.progress >= 1.0) {
                const credit = t.credit;
                E += credit;

                // Roll up E
                let nodeId: string | null = t.nodeId;
                // Re-fetch node map if needed? We already have allNodes map.
                // We loaded allNodes earlier: const nodeMap = ...
                while (nodeId) {
                    addFn(byNodeE, nodeId, credit);
                    const node = nodeMap.get(nodeId);
                    nodeId = node && node.parentId ? node.parentId : null;
                }
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

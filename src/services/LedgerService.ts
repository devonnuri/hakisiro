import { db } from '../db';
import type { DailyStats, LogEntry, Task } from '../types/db';

export const LedgerService = {
  async logProgressDelta(date: string, taskId: string, delta: number): Promise<void> {
    const id = `${date}:${taskId}`;

    await db.transaction('rw', db.logEntries, db.dailyStats, async () => {
      const entry = await db.logEntries.get(id);
      const currentWeight = entry?.weight ?? 0;

      await db.logEntries.put({
        id,
        date,
        taskId,
        weight: currentWeight + delta,
        updatedAt: Date.now()
      });
    });

    await this.recomputeDailyStats(date);
  },

  async recomputeDailyStats(date: string): Promise<void> {
    const logs = await db.logEntries.where('date').equals(date).toArray();
    const shouldMaintainEntry = await this.shouldMaintainStatsForDate(date);

    if (logs.length === 0 && !shouldMaintainEntry) {
      await db.dailyStats.delete(date);
      return;
    }

    const taskMap = new Map(
      (await db.tasks.bulkGet(logs.map((l) => l.taskId)))
        .filter((t): t is Task => !!t)
        .map((t) => [t.id, t])
    );

    const nodeMap = new Map((await db.nodes.toArray()).map((n) => [n.id, n]));

    let A = 0;
    let E = 0;
    const byNodeA: Record<string, number> = {};
    const byNodeE: Record<string, number> = {};

    const addToNode = (map: Record<string, number>, nodeId: string | null, val: number) => {
      let current = nodeId;
      while (current) {
        map[current] = (map[current] || 0) + val;
        current = nodeMap.get(current)?.parentId ?? null;
      }
    };

    for (const log of logs) {
      const task = taskMap.get(log.taskId);
      if (!task) continue;

      const valA = (task.credit * log.weight) / 10.0;
      A += valA;
      addToNode(byNodeA, task.nodeId, valA);
    }

    const completedTasks = await db.tasks.where('completionDate').equals(date).toArray();
    for (const task of completedTasks) {
      if (task.progress >= 10) {
        E += task.credit;
        addToNode(byNodeE, task.nodeId, task.credit);
      }
    }

    await db.dailyStats.put({
      date,
      A,
      E,
      byNodeA,
      byNodeE,
      updatedAt: Date.now()
    });
  },

  async getDailyStats(date: string): Promise<DailyStats | undefined> {
    return db.dailyStats.get(date);
  },

  async getLogsForDate(date: string): Promise<LogEntry[]> {
    return db.logEntries.where('date').equals(date).toArray();
  },

  async shouldMaintainStatsForDate(date: string): Promise<boolean> {
    const firstStats = await db.dailyStats.orderBy('date').first();
    return firstStats ? date >= firstStats.date : false;
  },

  async ensureDailyStatsContinuity(endDate?: string): Promise<void> {
    const firstStats = await db.dailyStats.orderBy('date').first();
    if (!firstStats) return;

    const endDateStr = endDate || new Date().toISOString().split('T')[0];
    const currentDate = new Date(firstStats.date);
    const lastDate = new Date(endDateStr);

    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = await db.dailyStats.get(dateStr);

      if (!existing) {
        await db.dailyStats.put({
          date: dateStr,
          A: 0,
          E: 0,
          byNodeA: {},
          byNodeE: {},
          updatedAt: Date.now()
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
};

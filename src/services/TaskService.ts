import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { Task } from '../types/db';
import { LedgerService } from './LedgerService';

export const TaskService = {
  async createTask(nodeId: string, title: string, credit: number): Promise<string> {
    const count = await db.tasks.where('nodeId').equals(nodeId).count();
    const newTask: Task = {
      id: uuidv4(),
      nodeId,
      title,
      credit,
      progress: 0,
      order: count,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.tasks.add(newTask);
    return newTask.id;
  },

  async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    const creditChanged = updates.credit !== undefined;

    await db.tasks.update(id, {
      ...updates,
      updatedAt: Date.now()
    });

    if (creditChanged) {
      const logEntries = await db.logEntries.where('taskId').equals(id).toArray();
      const affectedDates = new Set(logEntries.map((log) => log.date));

      const task = await db.tasks.get(id);
      if (task?.completionDate) {
        affectedDates.add(task.completionDate);
      }

      for (const date of affectedDates) {
        await LedgerService.recomputeDailyStats(date);
      }
    }
  },

  async deleteTask(id: string): Promise<void> {
    await db.tasks.delete(id);
  },

  async addPrereq(taskId: string, prereqTaskId: string): Promise<void> {
    if (taskId === prereqTaskId) {
      throw new Error('Task cannot depend on itself.');
    }

    const existing = await db.taskPrereqs
      .where('[taskId+prereqTaskId]')
      .equals([taskId, prereqTaskId])
      .first();

    if (existing) return;

    if (await this.hasPath(prereqTaskId, taskId)) {
      throw new Error('Cycle detected: this prerequisite would create a loop.');
    }

    await db.taskPrereqs.add({ taskId, prereqTaskId });
  },

  async removePrereq(taskId: string, prereqTaskId: string): Promise<void> {
    await db.taskPrereqs.where('[taskId+prereqTaskId]').equals([taskId, prereqTaskId]).delete();
  },

  async hasPath(startId: string, endId: string, visited = new Set<string>()): Promise<boolean> {
    if (startId === endId) return true;
    if (visited.has(startId)) return false;

    visited.add(startId);
    const edges = await db.taskPrereqs.where('taskId').equals(startId).toArray();

    for (const edge of edges) {
      if (await this.hasPath(edge.prereqTaskId, endId, visited)) {
        return true;
      }
    }

    return false;
  }
};

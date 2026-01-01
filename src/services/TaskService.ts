import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { Task } from '../types/db';

export const TaskService = {
    async createTask(nodeId: string, title: string, credit: number): Promise<string> {
        const newTask: Task = {
            id: uuidv4(),
            nodeId,
            title,
            credit,
            progress: 0.0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await db.tasks.add(newTask);
        return newTask.id;
    },

    async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
        await db.tasks.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
    },

    // Archive concept removed per request, or strictly filtered via UI? 
    // Request said "Remove isDone, isArchived". 
    // If we need deletion/soft-deletion, we might just rely on delete?
    // Let's remove archiveTask for now.


    async addPrereq(taskId: string, prereqTaskId: string): Promise<void> {
        if (taskId === prereqTaskId) throw new Error("Task cannot depend on itself.");

        // Check for existing linkage
        const existing = await db.taskPrereqs
            .where('[taskId+prereqTaskId]')
            .equals([taskId, prereqTaskId])
            .first();
        if (existing) return; // already exists

        // Cycle Detection (DFS)
        // We want to add edge: taskId -> prereqTaskId
        // Cycle exists if there is already a path from prereqTaskId -> taskId

        if (await this.hasPath(prereqTaskId, taskId)) {
            throw new Error("Cycle detected: this prerequisite would create a loop.");
        }

        await db.taskPrereqs.add({ taskId, prereqTaskId });
    },

    async removePrereq(taskId: string, prereqTaskId: string): Promise<void> {
        await db.taskPrereqs
            .where('[taskId+prereqTaskId]')
            .equals([taskId, prereqTaskId])
            .delete();
    },

    // Helper for cycle detection: checks if path exists from startId to endId
    async hasPath(startId: string, endId: string, visited = new Set<string>()): Promise<boolean> {
        if (startId === endId) return true;
        if (visited.has(startId)) return false;
        visited.add(startId);

        // Find all tasks that 'startId' depends on (direct parents in dependency graph)
        // Wait, the edge direction: taskId DEPENDS ON prereqTaskId.
        // Graph direction: taskId -> prereqTaskId.
        // If I add A -> B. Cycle if path B -> ... -> A exists.
        // So I need to traverse from B (prereqTaskId) following edges `from -> to`.

        // In db.taskPrereqs: { taskId: A, prereqTaskId: B } means A -> B.
        // So neighbor of A is B.
        // We want to see if we can reach endId starting from startId.

        const edges = await db.taskPrereqs.where('taskId').equals(startId).toArray();

        for (const edge of edges) {
            if (await this.hasPath(edge.prereqTaskId, endId, visited)) {
                return true;
            }
        }

        return false;
    }
};

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { TreeNode } from '../types/db';

export const NodeService = {
    async createNode(parentId: string | null, name: string, code: string): Promise<string> {
        // Check if code exists (redundant with DB uniqueness, but good for UI feedback)
        const existing = await db.nodes.where('code').equals(code).first();
        if (existing) {
            throw new Error(`Node code "${code}" already exists.`);
        }

        // Check Max Depth
        if (parentId) {
            const depth = await this.getNodeDepth(parentId);
            if (depth >= 3) { // parent is at 3 (0,1,2,3), new node would be 4. limit is 4 levels (0..3) or depth 4?
                // Requirement: "at most depth of 4" -> levels 0, 1, 2, 3.
                // If parent is level 3, child is level 4 (5th level). So fail. as 0-index.
                // Let's assume depth means number of levels.
                throw new Error("Maximum tree depth of 4 reached.");
            }
        }

        const newNode: TreeNode = {
            id: uuidv4(),
            parentId,
            name,
            code,
            order: Date.now(), // simple ordering
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await db.nodes.add(newNode);
        return newNode.id;
    },

    async updateNode(id: string, updates: Partial<Pick<TreeNode, 'name' | 'code' | 'parentId' | 'order'>>): Promise<void> {
        if (updates.code) {
            const existing = await db.nodes.where('code').equals(updates.code).first();
            if (existing && existing.id !== id) {
                throw new Error(`Node code "${updates.code}" already exists.`);
            }
        }

        // Cycle check if moving
        if (updates.parentId) {
            let current = await db.nodes.get(updates.parentId);
            while (current) {
                if (current.id === id) {
                    throw new Error("Cannot move node into its own descendant.");
                }
                if (!current.parentId) break;
                current = await db.nodes.get(current.parentId);
            }
        }

        await db.nodes.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
    },

    async deleteNode(id: string): Promise<void> {
        // Prevent deleting root-like nodes if we decide to have a fixed root, 
        // but specified requirements say "root cannot be deleted". 
        // However, if we model root as null parent, then top-level nodes can be deleted?
        // "Node CRUD: create/rename/move/delete (root cannot be deleted)"
        // The "root" in the example `CP (C)` might be a node with null parent? 
        // Or is there a single implicit virtual root?
        // Usually tree UI has a virtual root. 
        // If user tries to delete a node with children, we should probably warn or cascade.
        // Let's prevent deletion if it has children for MVP safety.

        const childCount = await db.nodes.where('parentId').equals(id).count();
        const taskCount = await db.tasks.where('nodeId').equals(id).count();

        if (childCount > 0) throw new Error("Cannot delete node with sub-nodes.");
        if (taskCount > 0) throw new Error("Cannot delete node with tasks.");

        await db.nodes.delete(id);
    },

    async getAllNodes(): Promise<TreeNode[]> {
        return await db.nodes.toArray();
    },

    async getNodeDepth(id: string): Promise<number> {
        let depth = 0;
        let current = await db.nodes.get(id);
        while (current && current.parentId) {
            depth++;
            current = await db.nodes.get(current.parentId);
        }
        return depth;
    }
};

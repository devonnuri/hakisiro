import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { TreeNode } from '../types/db';

export const NodeService = {
  async createNode(parentId: string | null, name: string, code: string): Promise<string> {
    const existing = await db.nodes.where('code').equals(code).first();
    if (existing) {
      throw new Error(`Node code "${code}" already exists.`);
    }

    if (parentId) {
      const depth = await this.getNodeDepth(parentId);
      if (depth >= 3) {
        throw new Error('Maximum tree depth of 4 reached.');
      }
    }

    const newNode: TreeNode = {
      id: uuidv4(),
      parentId,
      name,
      code,
      order: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.nodes.add(newNode);
    return newNode.id;
  },

  async updateNode(
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'code' | 'parentId' | 'order'>>
  ): Promise<void> {
    if (updates.code) {
      const existing = await db.nodes.where('code').equals(updates.code).first();
      if (existing && existing.id !== id) {
        throw new Error(`Node code "${updates.code}" already exists.`);
      }
    }

    if (updates.parentId) {
      let current = await db.nodes.get(updates.parentId);
      while (current) {
        if (current.id === id) {
          throw new Error('Cannot move node into its own descendant.');
        }
        current = current.parentId ? await db.nodes.get(current.parentId) : undefined;
      }
    }

    await db.nodes.update(id, {
      ...updates,
      updatedAt: Date.now()
    });
  },

  async deleteNode(id: string): Promise<void> {
    const childCount = await db.nodes.where('parentId').equals(id).count();
    const taskCount = await db.tasks.where('nodeId').equals(id).count();

    if (childCount > 0) throw new Error('Cannot delete node with sub-nodes.');
    if (taskCount > 0) throw new Error('Cannot delete node with tasks.');

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

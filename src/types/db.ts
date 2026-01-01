export interface TreeNode {
  id: string; // uuid
  parentId: string | null;
  name: string;
  code: string; // unique short code
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string; // uuid
  nodeId: string;
  title: string;
  credit: number; // integer
  progress: number; // 0.0 - 1.0
  completionDate?: string | null; // YYYY-MM-DD
  tags?: string[];
  sourceRef?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskPrereq {
  id?: number; // auto-inc
  taskId: string;
  prereqTaskId: string;
}

export interface TodayItem {
  id?: number; // auto-inc
  date: string; // YYYY-MM-DD
  taskId: string;
  order: number;
}

export interface LogEntry {
  id: string; // uuid or `${date}:${taskId}`
  date: string; // YYYY-MM-DD
  taskId: string;
  weight: number; // 0.0 - 1.0
  note?: string;
  updatedAt: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD, pk
  A: number; // Activity credits
  E: number; // Earned/Strict credits
  byNodeA: Record<string, number>; // nodeId -> credits
  byNodeE: Record<string, number>;
  updatedAt: number;
}

export interface Meta {
  key: string;
  value: any;
}

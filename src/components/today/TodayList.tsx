import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LedgerService } from '../../services/LedgerService';
import { TaskService } from '../../services/TaskService';
import { Button } from '../ui/Button';
import { ProgressControl } from '../common/ProgressControl';
import type { LogEntry, Task } from '../../types/db';

interface TodayRowProps {
  task?: Task;
  log?: LogEntry;
  onProgressChange: (newVal: number) => void;
  onRemove: () => void;
  nodeCode?: string;
}

const TodayRow: React.FC<TodayRowProps> = ({ task, log, onProgressChange, onRemove, nodeCode }) => {
  if (!task) return null;

  // log.weight is now "Sum of Deltas Today".
  // Activity generated today = credit * weight.
  const activityToday = ((task.credit * (log?.weight || 0)) / 10).toFixed(1);

  return (
    <div className="panel" style={{ marginBottom: 4 }}>
      <div className="panel-content" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="text-dim" style={{ width: 40, fontSize: '0.8em' }}>
          {nodeCode}
        </div>

        <div style={{ flex: 1 }}>
          <div>{task.title}</div>
          <div className="text-dim" style={{ fontSize: '0.8em' }}>
            {task.credit}&copy;
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProgressControl value={task.progress} onChange={onProgressChange} />
          </div>
          <div style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
            ({(log?.weight || 0) > 0 ? '+' : ''}
            {((log?.weight || 0) / 10).toFixed(1)})
          </div>
        </div>

        <div
          style={{
            width: 50,
            textAlign: 'right',
            fontWeight: 'bold',
            color: 'var(--accent-color)'
          }}
          title="Activity Generated Today"
        >
          {activityToday}
        </div>

        <div style={{ marginLeft: 8, cursor: 'pointer', color: '#666' }} onClick={onRemove}>
          x
        </div>
      </div>
    </div>
  );
};

interface TodayListProps {
  date: string;
}

// Helper component for Search
const TaskSearch: React.FC<{ date: string; onCancel: () => void }> = ({ date, onCancel }) => {
  const [search, setSearch] = React.useState('');

  // Fetch generic tasks + node codes
  // Optim: Fetch all tasks & nodes? Or search?
  // Let's fetch all tasks for filtering.
  const data = useLiveQuery(async () => {
    const tasks = await db.tasks.toArray();
    const nodes = await db.nodes.toArray();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    return { tasks, nodeMap };
  }, []);

  // Fetch today's items to exclude already added tasks
  const todayItems = useLiveQuery(() => db.todayItems.where('date').equals(date).toArray(), [date]);

  const matches = React.useMemo(() => {
    if (!data || !todayItems) return [];

    const todayTaskIds = new Set(todayItems.map((i) => i.taskId));
    const availableTasks = data.tasks.filter(
      (t) => !todayTaskIds.has(t.id) && (t.progress || 0) < 10
    );

    if (search.trim()) {
      // Search mode: filter by title
      const term = search.toLowerCase();
      return availableTasks
        .filter((t) => t.title.toLowerCase().includes(term))
        .slice(0, 5) // Limit results
        .map((t) => ({
          ...t,
          nodeCode: data.nodeMap.get(t.nodeId)?.code || '?'
        }));
    } else {
      // No search: show candidates
      // (1) In-progress tasks
      const inProgressTasks = availableTasks
        .filter((t) => t.progress > 0 && t.progress < 10)
        .sort((a, b) => a.order - b.order);

      // (2) Unstarted tasks ordered by node progress ratio
      const nodeStats = new Map<string, { current: number; max: number }>();
      for (const t of data.tasks) {
        if (!nodeStats.has(t.nodeId)) nodeStats.set(t.nodeId, { current: 0, max: 0 });
        const s = nodeStats.get(t.nodeId)!;
        s.current += (t.progress || 0) * t.credit;
        s.max += 10 * t.credit;
      }

      const inProgressIds = new Set(inProgressTasks.map((t) => t.id));
      const remainingTasks = availableTasks.filter((t) => !inProgressIds.has(t.id));
      const remainingByNode = new Map<string, Task[]>();
      for (const t of remainingTasks) {
        if (!remainingByNode.has(t.nodeId)) remainingByNode.set(t.nodeId, []);
        remainingByNode.get(t.nodeId)!.push(t);
      }
      for (const list of remainingByNode.values()) {
        list.sort((a, b) => a.order - b.order);
      }

      const nodesByRatio = Array.from(remainingByNode.keys()).sort((a, b) => {
        const aStats = nodeStats.get(a);
        const bStats = nodeStats.get(b);
        const aRatio = aStats && aStats.max > 0 ? aStats.current / aStats.max : 0;
        const bRatio = bStats && bStats.max > 0 ? bStats.current / bStats.max : 0;
        return bRatio - aRatio;
      });

      const ordered: Task[] = [...inProgressTasks];
      for (const nodeId of nodesByRatio) {
        const stats = nodeStats.get(nodeId);
        const ratio = stats && stats.max > 0 ? stats.current / stats.max : 0;
        if (ratio >= 1) continue;
        const list = remainingByNode.get(nodeId);
        if (list) ordered.push(...list);
      }

      return ordered.slice(0, 5).map((t) => ({
        ...t,
        nodeCode: data.nodeMap.get(t.nodeId)?.code || '?'
      }));
    }
  }, [data, search, todayItems]);

  const handleSelect = async (task: Task) => {
    // Add to Today
    // Check duplicates
    const exists = await db.todayItems.where('[date+taskId]').equals([date, task.id]).first();
    if (exists) {
      onCancel(); // Just close if exists? Or alert?
      return;
    }
    const count = await db.todayItems.where('date').equals(date).count();
    await db.todayItems.add({
      date,
      taskId: task.id,
      order: count
    });
    onCancel(); // Close search
  };

  return (
    <div className="panel" style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          autoFocus
          className="retro-input"
          style={{ flex: 1 }}
          placeholder="Search task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={onCancel}>Cancel</Button>
      </div>
      {matches.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border-color)' }}>
          {!search.trim() && (
            <div style={{ padding: '4px 4px', fontSize: '0.8em', color: 'var(--text-secondary)' }}>
              Suggestions
            </div>
          )}
          {matches.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '8px 4px',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between'
              }}
              onClick={() => handleSelect(t)}
              className="hover-bg"
            >
              <span>{t.title}</span>
              <span className="text-dim" style={{ fontSize: '0.8em' }}>
                {t.nodeCode}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TodayList: React.FC<TodayListProps> = ({ date }) => {
  const items = useLiveQuery(
    () => db.todayItems.where('date').equals(date).sortBy('order'),
    [date]
  );
  const [isAdding, setIsAdding] = React.useState(false);

  // Complex query to resolve dependencies
  const tasksInfo = useLiveQuery(async () => {
    if (!items) return { tasks: {}, logs: {}, nodes: {} };

    // Fetch tasks
    const tIds = items.map((i) => i.taskId);
    const tasksArr = await db.tasks.bulkGet(tIds);
    const tasksMap: Record<string, Task> = {};
    const nodeIds = new Set<string>();

    tasksArr.forEach((t) => {
      if (t) {
        tasksMap[t.id] = t;
        nodeIds.add(t.nodeId);
      }
    });

    // Fetch logs
    const logsArr = await db.logEntries.where('date').equals(date).toArray();
    const logsMap: Record<string, LogEntry> = {};
    logsArr.forEach((l) => (logsMap[l.taskId] = l));

    // Fetch Nodes for codes
    const nodesArr = await db.nodes.bulkGet(Array.from(nodeIds));
    const nodesMap: Record<string, string> = {};
    nodesArr.forEach((n) => {
      if (n) nodesMap[n.id] = n.code;
    });

    return { tasks: tasksMap, logs: logsMap, nodes: nodesMap };
  }, [items, date]);

  const handleProgressChange = async (task: Task, newProgress: number) => {
    const oldProgress = task.progress || 0;
    const delta = newProgress - oldProgress;

    const updates: any = { progress: newProgress };

    if (newProgress >= 10 && oldProgress < 10) {
      updates.completionDate = date; // Use the view's date
    } else if (newProgress < 10 && oldProgress >= 10) {
      updates.completionDate = null;
    }

    await TaskService.updateTask(task.id, updates);
    await LedgerService.logProgressDelta(date, task.id, delta);
  };

  const handleRemove = async (itemId: number | undefined, task: Task | undefined) => {
    if (!itemId) return;

    // Logic: Revert progress made today
    if (task) {
      const logId = `${date}:${task.id}`;
      const log = await db.logEntries.get(logId);

      if (log) {
        // Revert progress
        // log.weight is the sum of deltas for this day.
        // If we remove the task from today, we undo all progress made today.
        const currentProgress = task.progress;
        const delta = log.weight;
        const newProgress = Math.max(0, currentProgress - delta); // Prevent negative

        const updates: any = { progress: newProgress };

        // Manage completionDate
        if (currentProgress >= 10 && newProgress < 10) {
          // If it was completed, and reverting makes it uncompleted
          updates.completionDate = null;
        }
        // Note: If task was completed yesterday, log.weight for today should be 0 (unless we did something).
        // If log.weight is 0, newProgress == currentProgress. completionDate logic safely ignored (>=10 && <10 false).

        await TaskService.updateTask(task.id, updates);
        await db.logEntries.delete(logId);
        await LedgerService.recomputeDailyStats(date); // Recalculate A/E
      }
    }

    await db.todayItems.delete(itemId);
  };

  if (!items || !tasksInfo) return <div>Loading...</div>;

  return (
    <div>
      {items.map((item) => {
        const task = tasksInfo.tasks[item.taskId];
        const log = tasksInfo.logs[item.taskId];
        const nodeCode = task ? tasksInfo.nodes[task.nodeId] : '';

        return (
          <TodayRow
            key={item.id}
            task={task}
            log={log}
            nodeCode={nodeCode}
            onProgressChange={(val) => task && handleProgressChange(task, val)}
            onRemove={() => handleRemove(item.id, task)}
          />
        );
      })}

      <div style={{ marginTop: 16 }}>
        {isAdding ? (
          <TaskSearch date={date} onCancel={() => setIsAdding(false)} />
        ) : (
          <Button onClick={() => setIsAdding(true)} className="full-width">
            + Add Task
          </Button>
        )}
      </div>
    </div>
  );
};

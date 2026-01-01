import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TaskService } from '../../services/TaskService';
import { LedgerService } from '../../services/LedgerService';
import { Button } from '../ui/Button';
import { ProgressControl } from '../common/ProgressControl';
import type { Task } from '../../types/db';

interface TaskListProps {
  nodeId: string;
}

export const TaskList: React.FC<TaskListProps> = ({ nodeId }) => {
  // Removed !t.isArchived filter as isArchived is removed
  const tasks = useLiveQuery(() => db.tasks.where('nodeId').equals(nodeId).toArray(), [nodeId]);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCredit, setNewCredit] = useState(1);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await TaskService.createTask(nodeId, newTitle, newCredit);
      setNewTitle('');
      setNewCredit(1);
      setIsCreating(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProgressChange = async (task: Task, newProgress: number) => {
    const oldProgress = task.progress || 0;
    const delta = newProgress - oldProgress;
    const today = new Date().toISOString().split('T')[0];

    const updates: any = { progress: newProgress };

    if (newProgress >= 10 && oldProgress < 10) {
      updates.completionDate = today;
    } else if (newProgress < 10 && oldProgress >= 10) {
      updates.completionDate = null;
    }

    await TaskService.updateTask(task.id, updates);
    await LedgerService.logProgressDelta(today, task.id, delta);
  };



  const handleCreditChange = async (task: Task, newCredit: string) => {
    const val = parseInt(newCredit);
    if (!isNaN(val) && val > 0) {
      await TaskService.updateTask(task.id, { credit: val });
    }
  };

  if (!tasks) return <div>Loading tasks...</div>;

  return (
    <div className="task-list">
      <div style={{ marginBottom: 16 }}>
        {isCreating ? (
          <form onSubmit={handleCreate} className="panel" style={{ padding: 8 }}>
            <div className="flex-col">
              <input
                autoFocus
                className="retro-input"
                placeholder="Task Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex-row">
                <label>Credit:</label>
                <input
                  type="number"
                  className="retro-input"
                  style={{ width: 60 }}
                  value={newCredit}
                  onChange={(e) => setNewCredit(Number(e.target.value))}
                  min={1}
                />
                <div style={{ flex: 1 }} />
                <Button type="button" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        ) : (
          <Button onClick={() => setIsCreating(true)} className="full-width">
            + Add Task
          </Button>
        )}
      </div>

      <div className="flex-col">
        {tasks.map((task) => {
          const isDone = task.progress >= 10;
          return (
            <div
              key={task.id}
              className="panel"
              style={{
                marginBottom: 8,
                borderColor: isDone ? 'var(--text-secondary)' : 'var(--border-color)'
              }}
            >
              <div className="panel-content flex-row" style={{ alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--text-secondary)' : 'inherit'
                  }}
                >
                  {task.title}
                </div>

                <div title="Credits" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>Credit:</span>
                  <input
                    type="number"
                    value={task.credit}
                    onChange={(e) => handleCreditChange(task, e.target.value)}
                    className="retro-input"
                    style={{
                      width: 40,
                      padding: '2px 4px',
                      textAlign: 'center',
                      border: 'none',
                      borderBottom: '1px solid var(--border-color)',
                      background: 'transparent'
                    }}
                    min={1}
                  />
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                    &nbsp;* {(task.progress / 10).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && !isCreating && (
          <div className="text-dim" style={{ textAlign: 'center' }}>
            No tasks in this node.
          </div>
        )}
      </div>
    </div>
  );
};

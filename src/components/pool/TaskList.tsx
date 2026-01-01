import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TaskService } from '../../services/TaskService';
import { Button } from '../ui/Button';
import type { Task } from '../../types/db';

interface TaskListProps {
  nodeId: string;
}

export const TaskList: React.FC<TaskListProps> = ({ nodeId }) => {
  // Sort by order
  const tasks = useLiveQuery(
    () => db.tasks.where('nodeId').equals(nodeId).sortBy('order'),
    [nodeId]
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCredit, setNewCredit] = useState(1);

  // DnD State
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  // Removed handleProgressChange as requested

  const handleCreditChange = async (task: Task, newCredit: string) => {
    const val = parseInt(newCredit);
    if (!isNaN(val) && val > 0) {
      await TaskService.updateTask(task.id, { credit: val });
    }
  };

  const handleDelete = async (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      await TaskService.deleteTask(task.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !tasks) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedId);
    const targetIndex = tasks.findIndex(t => t.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) return;

    // Reorder
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, moved);

    // Update orders in DB
    // Optim: update only affected range?
    // Simpler: update all for now (usually < 50 items).
    await db.transaction('rw', db.tasks, async () => {
      for (let i = 0; i < newTasks.length; i++) {
        if (newTasks[i].order !== i) {
          await db.tasks.update(newTasks[i].id, { order: i });
        }
      }
    });

    setDraggedId(null);
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
                <label>&copy;</label>
                <input
                  type="number"
                  className="retro-input"
                  style={{ width: 60 }}
                  value={newCredit}
                  onChange={(e) => setNewCredit(Number(e.target.value))}
                  min={1}
                  step={1}
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
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task.id)}
              style={{
                marginBottom: 2,
                borderColor: isDone ? 'var(--text-secondary)' : 'var(--border-color)',
                opacity: draggedId === task.id ? 0.5 : 1,
                cursor: 'grab'
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
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>&copy;</span>
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

                <div style={{ marginLeft: 8 }}>
                  <Button
                    onClick={() => handleDelete(task)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.8em',
                      borderColor: '#d32f2f',
                      color: '#d32f2f'
                    }}
                  >
                    x
                  </Button>
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

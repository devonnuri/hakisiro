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
    const tasks = useLiveQuery(
        () => db.tasks.where('nodeId').equals(nodeId).filter(t => !t.isArchived).toArray(),
        [nodeId]
    );

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

    const handleToggleDone = async (task: Task) => {
        await TaskService.updateTask(task.id, { isDone: !task.isDone });
    };

    const handleAddToToday = async (task: Task) => {
        // Check if added today
        const date = new Date().toISOString().split('T')[0];
        const exists = await db.todayItems.where('[date+taskId]').equals([date, task.id]).first();
        if (exists) {
            alert("Already in Today's list");
            return;
        }
        const count = await db.todayItems.where('date').equals(date).count();
        await db.todayItems.add({
            date,
            taskId: task.id,
            order: count
        });
        // Feedback?
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
                                onChange={e => setNewTitle(e.target.value)}
                            />
                            <div className="flex-row">
                                <label>Cr:</label>
                                <input
                                    type="number"
                                    className="retro-input"
                                    style={{ width: 60 }}
                                    value={newCredit}
                                    onChange={e => setNewCredit(Number(e.target.value))}
                                    min={1}
                                />
                                <div style={{ flex: 1 }} />
                                <Button type="button" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <Button onClick={() => setIsCreating(true)} className="full-width">+ Add Task</Button>
                )}
            </div>

            <div className="flex-col">
                {tasks.map(task => (
                    <div key={task.id} className="panel" style={{ marginBottom: 8, borderColor: task.isDone ? 'var(--text-secondary)' : 'var(--border-color)' }}>
                        <div className="panel-content flex-row">
                            <div
                                style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={() => handleToggleDone(task)}
                            >
                                [{task.isDone ? 'x' : ' '}]
                            </div>
                            <div style={{ flex: 1, textDecoration: task.isDone ? 'line-through' : 'none', color: task.isDone ? 'var(--text-secondary)' : 'inherit' }}>
                                {task.title}
                            </div>
                            <div title="Credits">
                                ({task.credit})
                            </div>
                            <Button onClick={() => handleAddToToday(task)} style={{ fontSize: '0.8em', padding: '2px 4px' }}>
                                To Today
                            </Button>
                        </div>
                    </div>
                ))}
                {tasks.length === 0 && !isCreating && (
                    <div className="text-dim" style={{ textAlign: 'center' }}>No tasks in this node.</div>
                )}
            </div>
        </div>
    );
};

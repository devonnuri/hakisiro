import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { LedgerService } from '../../services/LedgerService';
import { Button } from '../ui/Button';
import type { LogEntry, Task } from '../../types/db';

interface TodayRowProps {
    task?: Task;
    log?: LogEntry;
    onWeightChange: (val: number) => void;
    onRemove: () => void;
    nodeCode?: string;
}

const TodayRow: React.FC<TodayRowProps> = ({ task, log, onWeightChange, onRemove, nodeCode }) => {
    if (!task) return null;

    const weight = log?.weight || 0;
    const earned = (task.credit * weight).toFixed(1);

    const handleStep = (delta: number) => {
        let newW = Math.round((weight + delta) * 10) / 10;
        if (newW < 0) newW = 0;
        if (newW > 1.0) newW = 1.0;
        onWeightChange(newW);
    };

    return (
        <div className="panel" style={{ marginBottom: 4 }}>
            <div className="panel-content" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="text-dim" style={{ width: 40, fontSize: '0.8em' }}>{nodeCode}</div>

                <div style={{ flex: 1 }}>
                    <div>{task.title}</div>
                    <div className="text-dim" style={{ fontSize: '0.8em' }}>Cr: {task.credit}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button onClick={() => handleStep(-0.1)} disabled={weight <= 0}>[-]</Button>
                    <div style={{ width: 40, textAlign: 'center', fontWeight: 'bold' }}>{weight.toFixed(1)}</div>
                    <Button onClick={() => handleStep(0.1)} disabled={weight >= 1.0}>[+]</Button>
                </div>

                <div style={{ width: 50, textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                    {earned}
                </div>

                <div style={{ marginLeft: 8, cursor: 'pointer', color: '#666' }} onClick={onRemove}>x</div>
            </div>
        </div>
    );
};

interface TodayListProps {
    date: string;
}

export const TodayList: React.FC<TodayListProps> = ({ date }) => {
    const items = useLiveQuery(() => db.todayItems.where('date').equals(date).sortBy('order'), [date]);

    const tasksInfo = useLiveQuery(async () => {
        if (!items) return { tasks: {}, logs: {}, nodes: {} };

        // Fetch tasks
        const tIds = items.map(i => i.taskId);
        const tasksArr = await db.tasks.bulkGet(tIds);
        const tasksMap: Record<string, Task> = {};
        const nodeIds = new Set<string>();

        tasksArr.forEach(t => {
            if (t) {
                tasksMap[t.id] = t;
                nodeIds.add(t.nodeId);
            }
        });

        // Fetch logs
        const logsArr = await db.logEntries.where('date').equals(date).toArray();
        const logsMap: Record<string, LogEntry> = {};
        logsArr.forEach(l => logsMap[l.taskId] = l);

        // Fetch Nodes for codes
        const nodesArr = await db.nodes.bulkGet(Array.from(nodeIds));
        const nodesMap: Record<string, string> = {};
        nodesArr.forEach(n => {
            if (n) nodesMap[n.id] = n.code;
        });

        return { tasks: tasksMap, logs: logsMap, nodes: nodesMap };
    }, [items, date]);

    const handleWeight = async (taskId: string, w: number) => {
        await LedgerService.upsertLog(date, taskId, w);
    };

    const handleRemove = async (itemId?: number) => {
        if (itemId) await db.todayItems.delete(itemId);
    };

    if (!items || !tasksInfo) return <div>Loading...</div>;

    return (
        <div>
            {items.map(item => {
                const task = tasksInfo.tasks[item.taskId];
                const log = tasksInfo.logs[item.taskId];
                const nodeCode = task ? tasksInfo.nodes[task.nodeId] : '';

                return (
                    <TodayRow
                        key={item.id}
                        task={task}
                        log={log}
                        nodeCode={nodeCode}
                        onWeightChange={(w) => handleWeight(item.taskId, w)}
                        onRemove={() => handleRemove(item.id)}
                    />
                );
            })}
            {items.length === 0 && (
                <div className="text-dim" style={{ textAlign: 'center', marginTop: 32 }}>
                    No tasks for {date}. <br /> Go to /pool to add some.
                </div>
            )}
        </div>
    );
};

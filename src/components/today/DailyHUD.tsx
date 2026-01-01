import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

interface DailyHUDProps {
    date: string;
}

export const DailyHUD: React.FC<DailyHUDProps> = ({ date }) => {
    const stats = useLiveQuery(() => db.dailyStats.get(date), [date]);

    return (
        <div className="panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--highlight-color)', marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold' }}>{date}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Activity:</span>
                <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                    {stats?.A?.toFixed(1) || '0.0'}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Earned:</span>
                <span style={{ fontSize: '1.2em' }}>
                    {stats?.E || 0}
                </span>
            </div>
        </div>
    );
};

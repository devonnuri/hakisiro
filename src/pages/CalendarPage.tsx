import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/index'; // Trying ../db/index if interpreted from src/pages
// But wait, if file is in src/pages/CalendarPage.tsx, it needs ../../db/index
// If file is in src/pages/CalendarPage.tsx (flat), it needs ../../db/index
// If file is in src/pages/CalendarPage.tsx, then .. is src/pages, ../.. is src. So ../../db is correct.
// Let's assume standard behavior. I will try to use the absolute path alias if configured, or just relative.
// "cannot find module".
// Let's try to list src/pages too to ensure where I am.

import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isToday
} from 'date-fns';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch stats for the whole month
  // Range query on dailyStats
  const stats = useLiveQuery(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    return db.dailyStats.where('date').between(startStr, endStr, true, true).toArray();
  }, [monthStart, monthEnd]);

  const statsMap = useMemo(() => {
    const map: Record<string, { A: number; E: number }> = {};
    stats?.forEach((s: any) => (map[s.date] = { A: s.A, E: s.E }));
    return map;
  }, [stats]);

  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        overflow: 'auto',
        maxWidth: '800px',
        margin: '0 auto'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}
      >
        <Button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>&lt; Prev</Button>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next &gt;</Button>
      </div>

      <Panel title="Calendar">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 1,
            background: 'var(--border-color)',
            padding: 1
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              style={{
                background: 'var(--panel-bg)',
                padding: 8,
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              {d}
            </div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`pad-${i}`} style={{ background: 'var(--panel-bg)' }} />
          ))}

          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const stat = statsMap[dateStr];
            const isTodayDate = isToday(day);

            return (
              <div
                key={dateStr}
                style={{
                  background: 'var(--panel-bg)',
                  padding: '8px',
                  minHeight: '80px',
                  cursor: 'pointer',
                  border: isTodayDate ? '2px solid var(--accent-color)' : 'none',
                  position: 'relative'
                }}
                onClick={() => navigate(`/day/${dateStr}`)}
              >
                <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: 4 }}>
                  {format(day, 'd')}
                </div>
                {stat && (
                  <div
                    style={{ fontSize: '0.8em', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div style={{ color: 'var(--accent-color)' }}>A: {stat.A.toFixed(1)}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>E: {stat.E}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};

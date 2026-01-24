import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
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
  const stats = useLiveQuery(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    return db.dailyStats.where('date').between(startStr, endStr, true, true).toArray();
  }, [monthStart, monthEnd]);

  // Fetch memos for the whole month
  const memos = useLiveQuery(() => {
    const startStr = format(monthStart, 'yyyy-MM-dd');
    const endStr = format(monthEnd, 'yyyy-MM-dd');
    return db.dailyMemos.where('date').between(startStr, endStr, true, true).toArray();
  }, [monthStart, monthEnd]);

  const { statsMap, maxA, memosMap } = useMemo(() => {
    const map: Record<string, { A: number; E: number }> = {};
    const momos: Record<string, boolean> = {};
    let max = 0;
    stats?.forEach((s: any) => {
      map[s.date] = { A: s.A, E: s.E };
      if (s.A > max) max = s.A;
    });
    memos?.forEach((m: any) => {
      momos[m.date] = true;
    });
    return { statsMap: map, maxA: max, memosMap: momos };
  }, [stats, memos]);

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
        <Button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>[ &lt; PREV ]</Button>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', textTransform: 'uppercase' }}>
          [ {format(currentMonth, 'MMMM yyyy')} ]
        </div>
        <Button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>[ NEXT &gt; ]</Button>
      </div>

      <div className="panel" style={{ border: '1px solid var(--border-color)', padding: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--highlight-color)'
          }}
        >
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <div
              key={d}
              style={{
                padding: '8px 4px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.9em'
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--border-color)',
            gridGap: '1px',
            border: '1px solid var(--border-color)',
            borderTop: 'none'
          }}
        >
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`pad-${i}`} style={{ background: 'var(--bg-color)', minHeight: 80 }} />
          ))}

          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const stat = statsMap[dateStr];
            const isTodayDate = isToday(day);

            // Heatmap logic
            let background = '#000';
            let color = 'var(--text-primary)';
            if (stat && stat.A > 0 && maxA > 0) {
              const intensity = Math.min(1, stat.A / maxA);
              // Calculate green intensity manually or use opacity
              // Using opacity on a green layer
              const alpha = 0.1 + intensity * 0.9;
              // Need a solid color for TUI feel ideally, or just use RGBA
              background = `rgba(59, 142, 234, ${alpha})`; // Blueish accent
              if (intensity > 0.5) color = '#fff';
            }

            return (
              <div
                key={dateStr}
                style={{
                  background: background,
                  color: color,
                  padding: '4px 8px',
                  minHeight: '80px',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: isTodayDate ? '2px solid var(--accent-color)' : 'none',
                  outlineOffset: '-2px'
                }}
                onClick={() => navigate(`/day/${dateStr}`)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4
                  }}
                >
                  {memosMap[dateStr] && (
                    <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>#</div>
                  )}
                  <div style={{ textAlign: 'right', fontWeight: 'bold', flex: 1 }}>
                    {format(day, 'd')}
                  </div>
                </div>
                {stat && stat.A > 0 && (
                  <div
                    style={{ fontSize: '0.75em', display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div>ACT: {stat.A.toFixed(1)}</div>
                    <div style={{ opacity: 0.8 }}>ERN: {stat.E}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

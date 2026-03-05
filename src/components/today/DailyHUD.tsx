import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

interface DailyHUDProps {
  date: string;
}

export const DailyHUD: React.FC<DailyHUDProps> = ({ date }) => {
  const stats = useLiveQuery(() => db.dailyStats.get(date), [date]);
  const allStats = useLiveQuery(() => db.dailyStats.orderBy('date').toArray());

  // Calculate current streak and max streak
  const streakData = useMemo(() => {
    if (!allStats || allStats.length === 0) {
      return { currentStreak: 0, maxStreak: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    // Create a map of dates to activity status
    const activityMap = new Map<string, boolean>();
    allStats.forEach((stat) => {
      activityMap.set(stat.date, stat.A > 0 || stat.E > 0);
    });

    // Helper function to get date string for a given offset from a date
    const getDateString = (dateStr: string, offset: number): string => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };

    // Calculate max streak by scanning all dates
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(activityMap.keys()).sort();

    if (sortedDates.length > 0) {
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];

      let currentDate = firstDate;
      while (currentDate <= lastDate) {
        const hasActivity = activityMap.get(currentDate);

        if (hasActivity) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }

        currentDate = getDateString(currentDate, 1);
      }
    }

    // Calculate current streak (counting backwards from today)
    let currentStreak = 0;
    let checkDate = today;

    while (true) {
      const hasActivity = activityMap.get(checkDate);

      if (hasActivity) {
        currentStreak++;
        checkDate = getDateString(checkDate, -1);
      } else {
        break;
      }
    }

    return { currentStreak, maxStreak };
  }, [allStats]);

  return (
    <div
      className="panel"
      style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        background: 'var(--highlight-color)',
        marginBottom: '16px'
      }}
    >
      <div style={{ fontWeight: 'bold' }}>{date}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Activity:</span>
        <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--accent-color)' }}>
          {stats?.A?.toFixed(1) || '0.0'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>Earned:</span>
        <span style={{ fontSize: '1.2em' }}>{stats?.E || 0}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Streak:</span>
        <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>
          {streakData.currentStreak}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>(Max: {streakData.maxStreak})</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}></div>
    </div>
  );
};

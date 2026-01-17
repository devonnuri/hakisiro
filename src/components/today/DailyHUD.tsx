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

    const sortedStats = allStats.sort((a, b) => a.date.localeCompare(b.date));
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // Check if today has any activity
    const today = new Date().toISOString().split('T')[0];
    const hasActivityToday = sortedStats.some((s) => s.date === today && (s.A > 0 || s.E > 0));

    for (let i = 0; i < sortedStats.length; i++) {
      const stat = sortedStats[i];
      const hasActivity = stat.A > 0 || stat.E > 0;

      if (hasActivity) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak (from most recent activity)
    if (hasActivityToday) {
      currentStreak = 1;
      for (let i = sortedStats.length - 2; i >= 0; i--) {
        const stat = sortedStats[i];
        const hasActivity = stat.A > 0 || stat.E > 0;
        if (hasActivity) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (sortedStats.length > 0) {
      const lastStat = sortedStats[sortedStats.length - 1];
      const lastDate = new Date(lastStat.date);
      const todayDate = new Date(today);
      const daysDiff = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Yesterday had activity, find the streak
        for (let i = sortedStats.length - 1; i >= 0; i--) {
          const stat = sortedStats[i];
          const hasActivity = stat.A > 0 || stat.E > 0;
          if (hasActivity) {
            currentStreak++;
          } else {
            break;
          }
        }
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

import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db';
import type { DailyStats } from '../../types/db';
import { Panel } from '../ui/Panel';

export const PatternDetection: React.FC = () => {
  const navigate = useNavigate();
  const stats = useLiveQuery(() => db.dailyStats.orderBy('date').toArray());

  // Weekday patterns
  const weekdayPatterns = useMemo(() => {
    if (!stats || stats.length === 0) return null;

    const patterns: Record<string, { count: number; totalA: number; totalE: number; avgA: number; avgE: number }> = {
      'Sunday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Monday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Tuesday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Wednesday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Thursday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Friday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 },
      'Saturday': { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 }
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const stat of stats) {
      const date = new Date(stat.date);
      const dayName = dayNames[date.getDay()];
      const pattern = patterns[dayName];

      pattern.count++;
      pattern.totalA += stat.A;
      pattern.totalE += stat.E;
    }

    for (const dayName of Object.keys(patterns)) {
      const pattern = patterns[dayName];
      pattern.avgA = pattern.count > 0 ? pattern.totalA / pattern.count : 0;
      pattern.avgE = pattern.count > 0 ? pattern.totalE / pattern.count : 0;
    }

    return patterns;
  }, [stats]);

  // Monthly trends
  const monthlyTrends = useMemo(() => {
    if (!stats || stats.length === 0) return null;

    const trends: Record<string, { count: number; totalA: number; totalE: number; avgA: number; avgE: number }> = {};

    for (const stat of stats) {
      const date = new Date(stat.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!trends[monthKey]) {
        trends[monthKey] = { count: 0, totalA: 0, totalE: 0, avgA: 0, avgE: 0 };
      }

      const trend = trends[monthKey];
      trend.count++;
      trend.totalA += stat.A;
      trend.totalE += stat.E;
    }

    for (const monthKey of Object.keys(trends)) {
      const trend = trends[monthKey];
      trend.avgA = trend.count > 0 ? trend.totalA / trend.count : 0;
      trend.avgE = trend.count > 0 ? trend.totalE / trend.count : 0;
    }

    return Object.entries(trends).sort(([a], [b]) => a.localeCompare(b));
  }, [stats]);

  // Top 10 high activity days
  const topDays = useMemo(() => {
    if (!stats || stats.length === 0) return [] as DailyStats[];
    return [...stats].sort((a, b) => b.A - a.A).slice(0, 10);
  }, [stats]);

  if (!stats || stats.length === 0) {
    return (
      <Panel title="Pattern Detection">
        <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>
          No data available for pattern analysis.
        </div>
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Weekday Pattern */}
      <Panel title="Weekday Pattern">
        <div style={{ padding: '16px' }}>
          {weekdayPatterns ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px'
              }}
            >
              {(() => {
                const maxAvg = Math.max(
                  1,
                  ...Object.values(weekdayPatterns).map((p) => p.avgA)
                );
                return Object.entries(weekdayPatterns).map(([day, pattern]) => {
                  const intensity = Math.max(0, Math.min(1, pattern.avgA / maxAvg));
                  const alpha = 0.12 + intensity * 0.68; // 0.12..0.8
                  const heatColor = `rgba(76, 175, 80, ${alpha.toFixed(3)})`; // #4caf50 with alpha
                  return (
                    <div
                      key={day}
                      style={{
                        textAlign: 'center',
                        padding: '8px',
                        background: heatColor,
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                      title={`${day}: avg ${pattern.avgA.toFixed(1)} (n=${pattern.count})`}
                    >
                      <div style={{ fontSize: '0.8em', color: '#fff' }}>{day.slice(0, 3)}</div>
                      <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#fff' }}>
                        {pattern.avgA.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '0.75em', color: '#e5e5e5' }}>n={pattern.count}</div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Monthly Trends */}
      <Panel title="Monthly Trends">
        <div style={{ padding: '16px' }}>
          {monthlyTrends && monthlyTrends.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {monthlyTrends.slice(-6).map(([month, trend]) => {
                const maxAvg = Math.max(...monthlyTrends.map(([, t]) => t.avgA));
                const percentage = (trend.avgA / Math.max(maxAvg, 1)) * 100;
                return (
                  <div key={month}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.9em' }}>{month}</span>
                      <span style={{ fontSize: '0.9em', color: 'var(--accent-color)' }}>
                        {trend.avgA.toFixed(1)}&copy;/day
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '16px',
                        background: '#222',
                        border: '1px solid var(--border-color)',
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'var(--accent-color)',
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Top Activity Days */}
      {topDays.length > 0 && (
        <Panel title="Top 10 Activity Days">
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const maxActivity = Math.max(...topDays.map((d) => d.A));
                return topDays.map((d) => {
                  const percentage = (d.A / Math.max(maxActivity, 1)) * 100;
                  return (
                    <div key={d.date}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <button
                          onClick={() => navigate(`/day/${d.date}`)}
                          style={{
                            fontSize: '0.9em',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0
                          }}
                        >
                          {d.date}
                        </button>
                        <span style={{ fontSize: '0.9em', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                          {d.A.toFixed(1)}&copy;
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '20px',
                          background: '#222',
                          border: '1px solid var(--border-color)',
                          position: 'relative',
                          borderRadius: '2px'
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'var(--accent-color)',
                            transition: 'width 0.3s',
                            borderRadius: '1px'
                          }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
};

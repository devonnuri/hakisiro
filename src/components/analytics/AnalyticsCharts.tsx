import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';

export const AnalyticsCharts: React.FC = () => {
  const stats = useLiveQuery(() => db.dailyStats.orderBy('date').toArray());
  const [metric, setMetric] = useState<'A' | 'E'>('A');

  const chartData = useMemo(() => {
    if (!stats || stats.length === 0) return [];
    
    // Create a complete date range from first to last date
    const firstDate = new Date(stats[0].date);
    const lastDate = new Date(stats[stats.length - 1].date);
    const dateMap = new Map(stats.map(s => [s.date, s]));
    
    const completeData = [];
    const currentDate = new Date(firstDate);
    
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr);
      completeData.push(existing || { date: dateStr, A: 0, E: 0, updatedAt: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return completeData;
  }, [stats]);

  const accumulatedData = useMemo(() => {
    let sumA = 0;
    let sumE = 0;
    return chartData.map((d) => {
      sumA += d.A || 0;
      sumE += d.E || 0;
      return { date: d.date, A: sumA, E: sumE };
    });
  }, [chartData]);

  if (!chartData.length) return <div>No data yet.</div>;

  // Render SVG
  const width = 600;
  const height = 300;
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const maxVal = Math.max(...chartData.map((d) => d[metric] || 0), 10); // min 10
  const barW = Math.max(2, chartW / chartData.length - 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel title="History">
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button
              onClick={() => setMetric('A')}
              style={{
                fontWeight: metric === 'A' ? 'bold' : 'normal',
                borderColor: metric === 'A' ? 'var(--accent-color)' : 'var(--border-color)'
              }}
            >
              Activity
            </Button>
            <Button
              onClick={() => setMetric('E')}
              style={{
                fontWeight: metric === 'E' ? 'bold' : 'normal',
                borderColor: metric === 'E' ? 'var(--accent-color)' : 'var(--border-color)'
              }}
            >
              Earned
            </Button>
          </div>

          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ background: '#050505', border: '1px solid #333' }}
          >
            {/* Axes */}
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#666"
            />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" />

            {/* Bars */}
            {chartData.map((d, i) => {
              const val = d[metric] || 0;
              const h = (val / maxVal) * chartH;
              const x = padding + i * (chartW / chartData.length) + (chartW / chartData.length - barW) / 2;
              const y = height - padding - h;
              return (
                <g key={d.date}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                    opacity={0.8}
                  >
                    <title>{`${d.date}: ${val}`}</title>
                  </rect>
                </g>
              );
            })}

            {/* Labels for Dates (simplified: first and last) */}
            <text x={padding} y={height - 10} fill="#666" fontSize="10">
              {chartData[0].date}
            </text>
            <text x={width - padding} y={height - 10} fill="#666" fontSize="10" textAnchor="end">
              {chartData[chartData.length - 1].date}
            </text>

            {/* Max Val Label */}
            <text x={padding - 5} y={padding} fill="#666" fontSize="10" textAnchor="end">
              {maxVal.toFixed(1)}
            </text>
          </svg>
        </div>
      </Panel>

      <Panel title="Accumulated Credits">
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Button
              onClick={() => setMetric('A')}
              style={{
                fontWeight: metric === 'A' ? 'bold' : 'normal',
                borderColor: metric === 'A' ? 'var(--accent-color)' : 'var(--border-color)'
              }}
            >
              Activity
            </Button>
            <Button
              onClick={() => setMetric('E')}
              style={{
                fontWeight: metric === 'E' ? 'bold' : 'normal',
                borderColor: metric === 'E' ? 'var(--accent-color)' : 'var(--border-color)'
              }}
            >
              Earned
            </Button>
          </div>

          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ background: '#050505', border: '1px solid #333' }}
          >
            {/* Axes */}
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#666"
            />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" />

            {/* Line Graph */}
            {(() => {
              const maxAccumulated = Math.max(...accumulatedData.map((d) => d[metric] || 0), 10);
              const points = accumulatedData.map((d, i) => {
                const val = d[metric] || 0;
                const x = padding + (i / (accumulatedData.length - 1)) * chartW;
                const y = height - padding - (val / maxAccumulated) * chartH;
                return `${x},${y}`;
              }).join(' ');

              return (
                <>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                    strokeWidth="2"
                  />
                  {/* Points */}
                  {accumulatedData.map((d, i) => {
                    const val = d[metric] || 0;
                    const x = padding + (i / (accumulatedData.length - 1)) * chartW;
                    const y = height - padding - (val / maxAccumulated) * chartH;
                    return (
                      <circle
                        key={d.date}
                        cx={x}
                        cy={y}
                        r="3"
                        fill={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                      >
                        <title>{`${d.date}: ${val.toFixed(1)}`}</title>
                      </circle>
                    );
                  })}
                </>
              );
            })()}

            {/* Labels for Dates */}
            <text x={padding} y={height - 10} fill="#666" fontSize="10">
              {accumulatedData[0].date}
            </text>
            <text x={width - padding} y={height - 10} fill="#666" fontSize="10" textAnchor="end">
              {accumulatedData[accumulatedData.length - 1].date}
            </text>

            {/* Max Val Label */}
            <text x={padding - 5} y={padding} fill="#666" fontSize="10" textAnchor="end">
              {Math.max(...accumulatedData.map((d) => d[metric] || 0), 10).toFixed(1)}
            </text>
          </svg>
        </div>
      </Panel>
    </div>
  );
};

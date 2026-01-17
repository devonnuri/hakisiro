import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { TreeNode, DailyStats } from '../../types/db';
import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import clsx from 'clsx';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface NodeItemProps {
  node: TreeNode | { id: 'ROOT'; name: string; code: string; parentId: null };
  level: number;
  childNodes: TreeNode[];
  allNodes: TreeNode[];
  onSelect: (nodeId: string) => void;
  selectedId?: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

const NodeItem: React.FC<NodeItemProps> = ({
  node,
  level,
  childNodes,
  allNodes,
  onSelect,
  selectedId,
  expandedIds,
  toggleExpand
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = childNodes.length > 0;

  return (
    <div style={{ marginLeft: 16 * Math.min(level, 1) }}>
      <div
        className={clsx('node-row', isSelected && 'selected')}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          cursor: 'pointer',
          border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
      >
        <div
          style={{
            width: 20,
            textAlign: 'center',
            marginRight: 4,
            cursor: 'pointer',
            fontFamily: 'monospace'
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(node.id);
          }}
        >
          {hasChildren ? (isExpanded ? '[-]' : '[+]') : ' . '}
        </div>
        <div style={{ fontWeight: 'bold' }}>{node.code}</div>
        <div style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>{node.name}</div>
      </div>

      {isExpanded && (
        <>
          {childNodes.map((child) => {
            const grandkids = allNodes
              .filter((n) => n.parentId === child.id)
              .sort((a, b) => a.order - b.order);
            return (
              <NodeItem
                key={child.id}
                node={child}
                level={level + 1}
                childNodes={grandkids}
                allNodes={allNodes}
                onSelect={onSelect}
                selectedId={selectedId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            );
          })}
        </>
      )}
    </div>
  );
};

export const AnalyticsTree: React.FC = () => {
  const nodes = useLiveQuery(() => db.nodes.toArray());
  const stats = useLiveQuery(() => db.dailyStats.orderBy('date').toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());

  const [selectedId, setSelectedId] = useState<string>('ROOT');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['ROOT']));

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setExpandedIds((prev) => {
        if (prev.size > 1) return prev; // already expanded beyond ROOT
        const all = new Set(prev);
        nodes.forEach((n) => all.add(n.id));
        return all;
      });
    }
  }, [nodes]);

  const rootNode: { id: 'ROOT'; name: string; code: string; parentId: null } = useMemo(
    () => ({ id: 'ROOT', name: 'All Nodes', code: 'ROOT', parentId: null }),
    []
  );

  const rootChildren = useMemo(() => {
    if (!nodes) return [] as TreeNode[];
    return nodes.filter((n) => !n.parentId).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  // Build chart data for selected node (or root)
  const [metric, setMetric] = useState<'A' | 'E'>('A');
  const [mode, setMode] = useState<'normal' | 'accumulated'>('normal');
  const [estimateEnabled, setEstimateEnabled] = useState<boolean>(false);

  const chartData = useMemo(() => {
    if (!stats || stats.length === 0) return [] as Array<{ date: string; A: number; E: number }>;

    const firstDate = new Date(stats[0].date);
    const lastDate = new Date(stats[stats.length - 1].date);
    const dateMap = new Map<string, DailyStats>(stats.map((s) => [s.date, s]));

    const out: Array<{ date: string; A: number; E: number }> = [];
    const cur = new Date(firstDate);
    while (cur <= lastDate) {
      const dstr = cur.toISOString().split('T')[0];
      const s = dateMap.get(dstr);
      if (selectedId === 'ROOT') {
        out.push({ date: dstr, A: s?.A || 0, E: s?.E || 0 });
      } else {
        const a = s?.byNodeA?.[selectedId] || 0;
        const e = s?.byNodeE?.[selectedId] || 0;
        out.push({ date: dstr, A: a, E: e });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [stats, selectedId]);

  const accumulatedData = useMemo(() => {
    let sumA = 0;
    let sumE = 0;
    return chartData.map((d) => {
      sumA += d.A || 0;
      sumE += d.E || 0;
      return { date: d.date, A: sumA, E: sumE };
    });
  }, [chartData]);

  // Helper: subtree node ids for selected node
  const subtreeNodeIds = useMemo(() => {
    if (!nodes || nodes.length === 0) return [] as string[];
    if (selectedId === 'ROOT') return nodes.map((n) => n.id);
    const set = new Set<string>([selectedId]);
    const stack = [selectedId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const n of nodes) {
        if (n.parentId === id && !set.has(n.id)) {
          set.add(n.id);
          stack.push(n.id);
        }
      }
    }
    return Array.from(set);
  }, [selectedId, nodes]);

  // Tasks in subtree and outstanding credits
  const outstanding = useMemo(() => {
    const tlist = (tasks || []).filter((t) => subtreeNodeIds.includes(t.nodeId));
    let outE = 0; // credits to earn (tasks not completed)
    let outA = 0; // activity required to finish (sum credit * remainingProgress/10)
    for (const t of tlist) {
      const progress = t.progress || 0; // 0..10
      if (progress < 10) {
        outE += t.credit;
        outA += (t.credit * (10 - progress)) / 10.0;
      }
    }
    return { outE, outA };
  }, [tasks, subtreeNodeIds]);

  // Average daily rates from last window
  const windowDays = 14;
  const avgRates = useMemo(() => {
    const recent = chartData.slice(-windowDays);
    const len = recent.length || 1;
    const avgA = recent.reduce((s, d) => s + (d.A || 0), 0) / len;
    const avgE = recent.reduce((s, d) => s + (d.E || 0), 0) / len;
    return { avgA, avgE };
  }, [chartData]);

  // Forecast days to finish based on Earned rate
  const lastStatDate = useMemo(() => {
    if (!stats || stats.length === 0) return new Date();
    return new Date(stats[stats.length - 1].date);
  }, [stats]);

  const forecastDays = useMemo(() => {
    if (!estimateEnabled) return 0;
    if (outstanding.outA <= 0) return 0;
    if (avgRates.avgA <= 0) return 0;
    return Math.ceil(outstanding.outA / avgRates.avgA);
  }, [estimateEnabled, outstanding, avgRates]);

  const finishDateStr = useMemo(() => {
    if (forecastDays <= 0) return '';
    const finish = new Date(lastStatDate);
    finish.setDate(finish.getDate() + forecastDays);
    const yyyy = finish.getFullYear();
    const mm = String(finish.getMonth() + 1).padStart(2, '0');
    const dd = String(finish.getDate()).padStart(2, '0');
    const today = new Date();
    const diffMs = finish.getTime() - today.getTime();
    const relDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${yyyy}/${mm}/${dd} (+${relDays}D)`;
  }, [forecastDays, lastStatDate]);

  const width = 600;
  const height = 300;
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const currentSeries = mode === 'normal' ? chartData : accumulatedData;

  // Extend series with forecast if enabled
  const displaySeries = useMemo(() => {
    if (!estimateEnabled || forecastDays <= 0) return currentSeries;
    if (mode === 'normal') {
      const future = Array.from({ length: forecastDays }).map((_, i) => {
        const lastDate = new Date(currentSeries[currentSeries.length - 1].date);
        lastDate.setDate(lastDate.getDate() + (i + 1));
        const dstr = lastDate.toISOString().split('T')[0];
        const valA = avgRates.avgA;
        const valE = avgRates.avgE;
        return { date: dstr, A: valA, E: valE };
      });
      return [...currentSeries, ...future];
    } else {
      // accumulated
      const lastA = currentSeries[currentSeries.length - 1].A || 0;
      const lastE = currentSeries[currentSeries.length - 1].E || 0;
      const targetA = lastA + outstanding.outA;
      const targetE = lastE + outstanding.outE;
      const future: Array<{ date: string; A: number; E: number }> = [];
      for (let i = 1; i <= forecastDays; i++) {
        const lastDate = new Date(currentSeries[currentSeries.length - 1].date);
        lastDate.setDate(lastDate.getDate() + i);
        const dstr = lastDate.toISOString().split('T')[0];
        const nextA = Math.min(targetA, lastA + avgRates.avgA * i);
        const nextE = Math.min(targetE, lastE + avgRates.avgE * i);
        future.push({ date: dstr, A: nextA, E: nextE });
      }
      return [...currentSeries, ...future];
    }
  }, [estimateEnabled, forecastDays, currentSeries, mode, avgRates, outstanding]);

  const maxVal = Math.max(...displaySeries.map((d) => d[metric] || 0), 10);
  const barW = Math.max(2, chartW / Math.max(1, displaySeries.length) - 2);

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', flexDirection: 'row' }}>
      {/* Tree */}
      <Panel
        title="Node Tree"
        style={{ flex: isMobile ? '1' : '0 0 300px', width: isMobile ? '100%' : '300px' }}
      >
        <div className="tree-content" style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
          <NodeItem
            node={rootNode}
            level={0}
            childNodes={rootChildren}
            allNodes={nodes || []}
            onSelect={setSelectedId}
            selectedId={selectedId}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        </div>
      </Panel>

      {/* Charts */}
      <div style={{ flex: 1, minWidth: isMobile ? '100%' : 300 }}>
        <Panel title={selectedId === 'ROOT' ? 'Overall History' : 'Node History'}>
          <div style={{ padding: 8 }}>
            {/* Row 1: Metric */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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

            {/* Row 2: Mode */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Button
                onClick={() => setMode('normal')}
                style={{
                  fontWeight: mode === 'normal' ? 'bold' : 'normal',
                  borderColor: mode === 'normal' ? 'var(--accent-color)' : 'var(--border-color)'
                }}
              >
                Normal
              </Button>
              <Button
                onClick={() => setMode('accumulated')}
                style={{
                  fontWeight: mode === 'accumulated' ? 'bold' : 'normal',
                  borderColor:
                    mode === 'accumulated' ? 'var(--accent-color)' : 'var(--border-color)'
                }}
              >
                Accumulated
              </Button>
            </div>

            {/* Row 3: Estimate */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Button
                onClick={() => setEstimateEnabled((v) => !v)}
                style={{
                  fontWeight: estimateEnabled ? 'bold' : 'normal',
                  borderColor: estimateEnabled ? 'var(--accent-color)' : 'var(--border-color)'
                }}
                title="Show estimation until all tasks are done"
              >
                Estimate
              </Button>
              {estimateEnabled && finishDateStr && (
                <div className="text-dim">ETA: {finishDateStr}</div>
              )}
            </div>

            {!chartData.length ? (
              <div style={{ color: 'var(--text-secondary)' }}>No data yet.</div>
            ) : (
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

                {mode === 'normal'
                  ? // Bars
                    displaySeries.map((d, i) => {
                      const val = d[metric] || 0;
                      const h = (val / maxVal) * chartH;
                      const x =
                        padding +
                        i * (chartW / displaySeries.length) +
                        (chartW / displaySeries.length - barW) / 2;
                      const y = height - padding - h;
                      const isForecast = estimateEnabled && i >= currentSeries.length;
                      return (
                        <g key={d.date}>
                          <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={h}
                            fill={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                            opacity={isForecast ? 0.4 : 0.8}
                          >
                            <title>{`${d.date}: ${val}`}</title>
                          </rect>
                        </g>
                      );
                    })
                  : // Accumulated line
                    (() => {
                      const maxAccum = Math.max(...displaySeries.map((d) => d[metric] || 0), 10);
                      const hist = displaySeries.slice(0, currentSeries.length);
                      const forecast = displaySeries.slice(currentSeries.length - 1); // include last point for continuity
                      const histPoints = hist
                        .map((d, i) => {
                          const val = d[metric] || 0;
                          const x = padding + (i / Math.max(1, displaySeries.length - 1)) * chartW;
                          const y = height - padding - (val / maxAccum) * chartH;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      const forecastPoints = forecast
                        .map((d, i) => {
                          const val = d[metric] || 0;
                          const x =
                            padding +
                            ((i + (currentSeries.length - 1)) /
                              Math.max(1, displaySeries.length - 1)) *
                              chartW;
                          const y = height - padding - (val / maxAccum) * chartH;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <>
                          <polyline
                            points={histPoints}
                            fill="none"
                            stroke={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                            strokeWidth="2"
                          />
                          {estimateEnabled && forecastDays > 0 && (
                            <polyline
                              points={forecastPoints}
                              fill="none"
                              stroke={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                              strokeWidth="2"
                              strokeDasharray="4 4"
                              opacity={0.7}
                            />
                          )}
                          {displaySeries.map((d, i) => {
                            const val = d[metric] || 0;
                            const x =
                              padding + (i / Math.max(1, displaySeries.length - 1)) * chartW;
                            const y = height - padding - (val / maxAccum) * chartH;
                            const isForecast = estimateEnabled && i >= currentSeries.length - 1;
                            return (
                              <circle
                                key={d.date}
                                cx={x}
                                cy={y}
                                r="3"
                                fill={metric === 'A' ? 'var(--accent-color)' : '#2196f3'}
                                opacity={isForecast ? 0.5 : 1}
                              >
                                <title>{`${d.date}: ${val.toFixed(1)}`}</title>
                              </circle>
                            );
                          })}
                        </>
                      );
                    })()}

                {/* Labels */}
                <text x={padding} y={height - 10} fill="#666" fontSize="10">
                  {displaySeries[0].date}
                </text>
                <text
                  x={width - padding}
                  y={height - 10}
                  fill="#666"
                  fontSize="10"
                  textAnchor="end"
                >
                  {displaySeries[displaySeries.length - 1].date}
                </text>
                <text x={padding - 5} y={padding} fill="#666" fontSize="10" textAnchor="end">
                  {maxVal.toFixed(1)}
                </text>
              </svg>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

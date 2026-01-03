import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { NodeService } from '../../services/NodeService';
import type { TreeNode } from '../../types/db';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { Input } from '../ui/Input';
import { TaskList } from './TaskList';
import clsx from 'clsx';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface NodeItemProps {
  node: TreeNode;
  level: number;
  childNodes: TreeNode[];
  allNodes: TreeNode[];
  onSelect: (node: TreeNode) => void;
  selectedId?: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  creatingParentId: string | null;
  onConfirmCreate: (name: string) => void;
  onCancelCreate: () => void;
  nodeStats?: Map<string, { current: number, max: number }>;
}

const NodeItem: React.FC<NodeItemProps> = ({
  node,
  level,
  childNodes,
  allNodes,
  onSelect,
  selectedId,
  expandedIds,
  toggleExpand,
  creatingParentId,
  onConfirmCreate,
  onCancelCreate,
  nodeStats
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = childNodes.length > 0;
  const isCreatingChild = creatingParentId === node.id;

  const stats = nodeStats?.get(node.id);
  const progressPercent = stats && stats.max > 0 ? (stats.current / stats.max) * 100 : 0;
  // If selected, maybe mix colors? simpler to just layer.
  // Selection uses background color. Gradient overrides background-color?
  // Use background-image for gradient, background-color for selection?
  // But wait, standard CSS: background sets all. 
  // Let's use a pseudo-element or just simple gradient logic.
  // User: "color with primary color in the ratio"

  // If selected, we might want it brighter?
  // Let's use the gradient as the base, and add a border or outline if selected?
  // Or: Selection adds a full highlight, progress adds a partial tint?
  // Let's keep it simple: Gradient IS the background. Selection is an outline or text color change?
  // Current selection: background: var(--highlight-color).
  // Problem: --highlight-color is opaque usually.

  // Strategy: 
  // background: linear-gradient(to right, var(--highlight-color) P%, transparent P%)
  // If selected, maybe just border? Or change the "transparent" part to "highlight-dim"?
  // Let's try: Overlay selection style via class.
  // Actually, user wants primary color.

  const bgStyle = {
    background: `linear-gradient(to right, var(--highlight-color) ${progressPercent}%, transparent ${progressPercent}%)`
  };

  if (isSelected) {
    // If selected, maybe make the WHOLE background highlight, but darker?
    // Or maybe just use a distinct border.
    // Let's stick to gradient, but if selected, maybe add a border.
  }

  return (
    <div style={{ marginLeft: 16 * Math.min(level, 1) }}>
      <div
        className={clsx('node-row', isSelected && 'selected')}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          cursor: 'pointer',
          border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
          ...bgStyle
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
      >
        <div
          style={{ width: 16, textAlign: 'center', marginRight: 4, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(node.id);
          }}
        >
          {hasChildren ? (isExpanded ? '∨' : '∧') : '·'}
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
                creatingParentId={creatingParentId}
                onConfirmCreate={onConfirmCreate}
                onCancelCreate={onCancelCreate}
                nodeStats={nodeStats}
              />
            );
          })}
          {isCreatingChild && (
            <div style={{ marginLeft: (level + 1) * 16, padding: '2px 4px' }}>
              <EditBox onSave={onConfirmCreate} onCancel={onCancelCreate} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Inline Edit component
const EditBox: React.FC<{
  initialValue?: string;
  onSave: (val: string) => void;
  onCancel: () => void
}> = ({
  initialValue = '',
  onSave,
  onCancel
}) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.value = initialValue;
        ref.current.focus();
        ref.current.select();
      }
    }, []); // Run once on mount

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (ref.current?.value.trim()) onSave(ref.current.value.trim());
        else onCancel();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        placeholder="Node Name..."
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Blur might trigger before click handling?
          // Usually safe to save on blur for "click away to save"
          if (ref.current?.value.trim()) onSave(ref.current.value.trim());
          else onCancel();
        }}
        style={{
          background: 'var(--bg-color)',
          color: 'var(--text-primary)',
          border: '1px solid var(--accent-color)',
          width: '150px',
          fontFamily: 'inherit'
        }}
      />
    );
  };

export const TreeViewer: React.FC = () => {
  const nodes = useLiveQuery(() => db.nodes.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());

  // Calculate Node Stats Map
  // Map<NodeId, { current: number, max: number }>
  const nodeStats = useMemo(() => {
    const stats = new Map<string, { current: number, max: number }>();
    if (!tasks) return stats;

    for (const t of tasks) {
      if (!stats.has(t.nodeId)) stats.set(t.nodeId, { current: 0, max: 0 });
      const s = stats.get(t.nodeId)!;
      s.current += (t.progress || 0) * t.credit;
      s.max += 10 * t.credit;
    }
    return stats;
  }, [tasks]);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Creation State
  const [creatingParentId, setCreatingParentId] = useState<string | null | 'ROOT'>(null); // 'ROOT' for creating root

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNode(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Default Expand All Logic
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setExpandedIds(prev => {
        if (prev.size > 0) return prev; // Already interacted or loaded
        const allIds = new Set(nodes.map(n => n.id));
        return allIds;
      });
    }
  }, [nodes]);

  const rootNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter((n) => !n.parentId).sort((a, b) => a.order - b.order);
  }, [nodes]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const handleStartCreateRoot = () => {
    setCreatingParentId('ROOT');
  };

  const handleStartCreateChild = () => {
    if (!selectedNode) return;
    setCreatingParentId(selectedNode.id);
    // Expand parent to show input
    if (!expandedIds.has(selectedNode.id)) {
      toggleExpand(selectedNode.id);
    }
  };

  const handleConfirmCreate = async (name: string) => {
    try {
      const parentId = creatingParentId === 'ROOT' ? null : creatingParentId;
      // Auto-generate code
      let code = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 6);
      // Ensure uniqueness (simple retry or fallback to random)
      const exists = await db.nodes.where('code').equals(code).count();
      if (exists > 0 || code.length === 0) {
        code = `N${Math.floor(Math.random() * 10000)}`;
      }

      await NodeService.createNode(parentId, name, code);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingParentId(null);
    }
  };

  // Editing Code/Name in Details
  // We need local state for inputs to allow editing
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  // Sync when selection changes
  useEffect(() => {
    if (selectedNode) {
      setEditName(selectedNode.name);
      setEditCode(selectedNode.code);
    }
  }, [selectedNode]);

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    if (!confirm(`Delete node "${selectedNode.name}" and all its data?`)) return;
    try {
      await NodeService.deleteNode(selectedNode.id);
      setSelectedNode(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateDetails = async () => {
    if (!selectedNode) return;
    try {
      await NodeService.updateNode(selectedNode.id, { name: editName, code: editCode });
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Responsive Logic
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isCreating = creatingParentId !== null;

  // If mobile:
  // - If creating, Show Tree (so user can type name).
  // - Else if selectedNode, Show Details.
  // - Else Show Tree.

  const showTree = !isMobile || isCreating || !selectedNode;
  const showDetails = !isMobile || (!!selectedNode && !isCreating);

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', flexDirection: 'row' }}>
      {showTree && (
        <Panel
          title="Node Tree"
          className="tree-panel"
          style={{
            flex: isMobile ? '1' : '0 0 300px',
            width: isMobile ? '100%' : '300px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          actions={
            <Button
              onClick={() => {
                if (selectedNode) handleStartCreateChild();
                else handleStartCreateRoot();
              }}
            >
              +
            </Button>
          }
        >
          <div
            className="tree-content"
            style={{ whiteSpace: 'nowrap', minWidth: 'fit-content', minHeight: '100%' }}
            onClick={() => setSelectedNode(null)}
          >
            {!nodes || nodes.length === 0
              ? creatingParentId !== 'ROOT' && (
                <div style={{ padding: 16, color: 'var(--text-secondary)' }}>
                  No nodes. Create a root.
                </div>
              )
              : rootNodes.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  level={0}
                  childNodes={nodes
                    .filter((n) => n.parentId === node.id)
                    .sort((a, b) => a.order - b.order)}
                  allNodes={nodes}
                  onSelect={setSelectedNode}
                  selectedId={selectedNode?.id}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  creatingParentId={creatingParentId === 'ROOT' ? null : creatingParentId}
                  onConfirmCreate={handleConfirmCreate}
                  onCancelCreate={() => setCreatingParentId(null)}
                  nodeStats={nodeStats}
                />
              ))}

            {creatingParentId === 'ROOT' && (
              <div style={{ padding: '2px 4px' }}>
                <EditBox onSave={handleConfirmCreate} onCancel={() => setCreatingParentId(null)} />
              </div>
            )}
          </div>
        </Panel>
      )}

      {showDetails && (
        <div style={{ flex: 1, minWidth: isMobile ? '100%' : 300 }}>
          {selectedNode ? (
            <Panel
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isMobile && (
                    <Button onClick={() => setSelectedNode(null)} style={{ padding: '0 8px' }}>
                      ←
                    </Button>
                  )}
                  {`Node: ${selectedNode.code}`}
                </div>
              }
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  {isMobile && (
                    <Button
                      onClick={handleStartCreateChild}
                      style={{ fontSize: '0.8em' }}
                      title="Add Child Node"
                    >
                      +
                    </Button>
                  )}
                  <Button
                    onClick={handleDeleteNode}
                    style={{ fontSize: '0.8em', borderColor: '#d32f2f', color: '#d32f2f' }}
                  >
                    Delete
                  </Button>
                </div>
              }
            >
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Input
                    label="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleUpdateDetails}
                  />
                  <Input
                    label="Code"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    onBlur={handleUpdateDetails}
                  />
                  <div className="text-dim" style={{ fontSize: '0.8em' }}>
                    {selectedNode.id}
                  </div>
                </div>

                <TaskList nodeId={selectedNode.id} />
              </div>
            </Panel>
          ) : (
            <Panel title="Details">
              <div style={{ padding: 16, color: 'var(--text-secondary)' }}>
                Select a node to view tasks.
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
};

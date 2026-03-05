import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { NodeService } from '../../services/NodeService';
import type { TreeNode } from '../../types/db';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { Input } from '../ui/Input';
import { TaskList } from './TaskList';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { NodeTree } from '../common/NodeTree';

export const TreeViewer: React.FC = () => {
  const nodes = useLiveQuery(() => db.nodes.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());

  // Calculate Node Stats Map
  // Map<NodeId, { current: number, max: number }>
  const nodeStats = useMemo(() => {
    const stats = new Map<string, { current: number; max: number }>();
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
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev; // Already interacted or loaded
        const allIds = new Set(nodes.map((n) => n.id));
        return allIds;
      });
    }
  }, [nodes]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const handleSelectNode = (nodeId: string) => {
    const node = nodes?.find((n) => n.id === nodeId);
    if (node) setSelectedNode(node);
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
            overflow: 'hidden'
          }}
          actions={
            <Button
              onClick={() => {
                if (selectedNode) handleStartCreateChild();
                else handleStartCreateRoot();
              }}
              style={{
                fontSize: '0.8em',
                color: 'var(--panel-bg)',
                borderColor: 'var(--panel-bg)'
              }}
            >
              +
            </Button>
          }
        >
          <NodeTree
            nodes={nodes}
            selectedId={selectedNode?.id}
            onSelect={handleSelectNode}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            creatingParentId={creatingParentId}
            onConfirmCreate={handleConfirmCreate}
            onCancelCreate={() => setCreatingParentId(null)}
            nodeStats={nodeStats}
            showProgress={true}
            onBackgroundClick={() => setSelectedNode(null)}
          />
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

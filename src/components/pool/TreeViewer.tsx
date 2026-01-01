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
  onCancelCreate
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = childNodes.length > 0;
  const isCreatingChild = creatingParentId === node.id;

  return (
    <div style={{ marginLeft: level * 16 }}>
      <div
        className={clsx('node-row', isSelected && 'selected')}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          cursor: 'pointer',
          background: isSelected ? 'var(--highlight-color)' : 'transparent'
        }}
        onClick={() => onSelect(node)}
      >
        <div
          style={{ width: 16, textAlign: 'center', marginRight: 4, cursor: 'pointer' }}
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
                creatingParentId={creatingParentId}
                onConfirmCreate={onConfirmCreate}
                onCancelCreate={onCancelCreate}
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
const EditBox: React.FC<{ onSave: (val: string) => void; onCancel: () => void }> = ({
  onSave,
  onCancel
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

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
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Creation State
  const [creatingParentId, setCreatingParentId] = useState<string | null | 'ROOT'>(null); // 'ROOT' for creating root

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
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
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

  const handleUpdateDetails = async () => {
    if (!selectedNode) return;
    try {
      await NodeService.updateNode(selectedNode.id, { name: editName, code: editCode });
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', flexDirection: 'row' }}>
      <Panel
        title="Node Tree"
        className="tree-panel"
        actions={<Button onClick={handleStartCreateRoot}>+ Root</Button>}
      >
        <div className="tree-content">
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
                />
              ))}

          {creatingParentId === 'ROOT' && (
            <div style={{ padding: '2px 4px' }}>
              <EditBox onSave={handleConfirmCreate} onCancel={() => setCreatingParentId(null)} />
            </div>
          )}
        </div>
      </Panel>

      <div style={{ flex: 1, minWidth: 300 }}>
        {selectedNode ? (
          <Panel
            title={`Node: ${selectedNode.code}`}
            actions={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={handleStartCreateChild} style={{ fontSize: '0.8em' }}>
                  + Child
                </Button>
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
    </div>
  );
};

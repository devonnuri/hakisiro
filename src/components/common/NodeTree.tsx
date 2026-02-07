import React, { useRef, useEffect } from 'react';
import type { TreeNode } from '../../types/db';
import clsx from 'clsx';

interface NodeItemProps {
  node: TreeNode | { id: 'ROOT'; name: string; code: string; parentId: null };
  level: number;
  childNodes: TreeNode[];
  allNodes: TreeNode[];
  onSelect: (nodeId: string) => void;
  selectedId?: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  creatingParentId?: string | null;
  onConfirmCreate?: (name: string) => void;
  onCancelCreate?: () => void;
  nodeStats?: Map<string, { current: number; max: number }>;
  showProgress?: boolean;
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
  nodeStats,
  showProgress = false
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = childNodes.length > 0;
  const isCreatingChild = creatingParentId === node.id;

  const stats = nodeStats?.get(node.id);
  const progressPercent = stats && stats.max > 0 ? (stats.current / stats.max) * 100 : 0;

  const bgStyle = showProgress
    ? {
        background: `linear-gradient(to right, var(--highlight-color) ${progressPercent}%, transparent ${progressPercent}%)`
      }
    : {};

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
                showProgress={showProgress}
              />
            );
          })}
          {isCreatingChild && onConfirmCreate && onCancelCreate && (
            <div style={{ marginLeft: (level + 1) * 16, padding: '2px 4px' }}>
              <EditBox onSave={onConfirmCreate} onCancel={onCancelCreate} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const EditBox: React.FC<{
  initialValue?: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}> = ({ initialValue = '', onSave, onCancel }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.value = initialValue;
      ref.current.focus();
      ref.current.select();
    }
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

interface NodeTreeProps {
  nodes: TreeNode[] | undefined;
  rootNode?: { id: 'ROOT'; name: string; code: string; parentId: null };
  selectedId?: string;
  onSelect: (nodeId: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  creatingParentId?: string | null | 'ROOT';
  onConfirmCreate?: (name: string) => void;
  onCancelCreate?: () => void;
  nodeStats?: Map<string, { current: number; max: number }>;
  showProgress?: boolean;
  onBackgroundClick?: () => void;
}

export const NodeTree: React.FC<NodeTreeProps> = ({
  nodes,
  rootNode,
  selectedId,
  onSelect,
  expandedIds,
  toggleExpand,
  creatingParentId,
  onConfirmCreate,
  onCancelCreate,
  nodeStats,
  showProgress = false,
  onBackgroundClick
}) => {
  const rootChildren = React.useMemo(() => {
    if (!nodes) return [] as TreeNode[];
    return nodes.filter((n) => !n.parentId).sort((a, b) => a.order - b.order);
  }, [nodes]);

  return (
    <div
      className="tree-content"
      style={{ whiteSpace: 'nowrap', minWidth: 'fit-content', minHeight: '100%' }}
      onClick={onBackgroundClick}
    >
      {rootNode && (
        <NodeItem
          node={rootNode}
          level={0}
          childNodes={rootChildren}
          allNodes={nodes || []}
          onSelect={onSelect}
          selectedId={selectedId}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          creatingParentId={creatingParentId === 'ROOT' ? null : creatingParentId}
          onConfirmCreate={onConfirmCreate}
          onCancelCreate={onCancelCreate}
          nodeStats={nodeStats}
          showProgress={showProgress}
        />
      )}

      {!rootNode && (
        <>
          {!nodes || nodes.length === 0
            ? creatingParentId !== 'ROOT' && (
                <div style={{ padding: 16, color: 'var(--text-secondary)' }}>
                  No nodes. Create a root.
                </div>
              )
            : rootChildren.map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  level={0}
                  childNodes={nodes
                    .filter((n) => n.parentId === node.id)
                    .sort((a, b) => a.order - b.order)}
                  allNodes={nodes}
                  onSelect={(nodeId) => {
                    const node = nodes.find((n) => n.id === nodeId);
                    if (node) onSelect(nodeId);
                  }}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  creatingParentId={creatingParentId === 'ROOT' ? null : creatingParentId}
                  onConfirmCreate={onConfirmCreate}
                  onCancelCreate={onCancelCreate}
                  nodeStats={nodeStats}
                  showProgress={showProgress}
                />
              ))}

          {creatingParentId === 'ROOT' && onConfirmCreate && onCancelCreate && (
            <div style={{ padding: '2px 4px' }}>
              <EditBox onSave={onConfirmCreate} onCancel={onCancelCreate} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

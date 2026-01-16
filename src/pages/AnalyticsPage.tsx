import React, { useState } from 'react';
import { AnalyticsTree } from '../components/analytics/AnalyticsTree';
import { PatternDetection } from '../components/analytics/PatternDetection';
import { Button } from '../components/ui/Button';

export const AnalyticsPage: React.FC = () => {
  const [view, setView] = useState<'perNode' | 'overall'>('perNode');

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      {/* View Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Button
          onClick={() => setView('perNode')}
          style={{
            fontWeight: view === 'perNode' ? 'bold' : 'normal',
            borderColor: view === 'perNode' ? 'var(--accent-color)' : 'var(--border-color)'
          }}
        >
          Per Node
        </Button>
        <Button
          onClick={() => setView('overall')}
          style={{
            fontWeight: view === 'overall' ? 'bold' : 'normal',
            borderColor: view === 'overall' ? 'var(--accent-color)' : 'var(--border-color)'
          }}
        >
          Overall
        </Button>
      </div>

      {/* Content */}
      {view === 'perNode' && (
        <div style={{ marginBottom: 24 }}>
          <AnalyticsTree />
        </div>
      )}

      {view === 'overall' && (
        <div>
          <PatternDetection />
        </div>
      )}
    </div>
  );
};

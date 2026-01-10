import React from 'react';
import { AnalyticsTree } from '../components/analytics/AnalyticsTree';

export const AnalyticsPage: React.FC = () => {
  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      {/* New: Node-wise analytics with root */}
      <div style={{ marginBottom: 24 }}>
        <AnalyticsTree />
      </div>
    </div>
  );
};

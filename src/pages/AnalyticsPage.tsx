import React from 'react';
import { AnalyticsCharts } from '../components/analytics/AnalyticsCharts';

export const AnalyticsPage: React.FC = () => {
  return (
    <div
      style={{
        padding: '16px',
        height: '100%',
        overflow: 'auto',
        maxWidth: '800px',
        margin: '0 auto'
      }}
    >
      <AnalyticsCharts />
    </div>
  );
};

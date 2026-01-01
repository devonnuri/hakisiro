import React from 'react';
import { TreeViewer } from '../components/pool/TreeViewer';

export const PoolPage: React.FC = () => {
    return (
        <div style={{ padding: '16px', height: '100%', overflow: 'hidden' }}>
            <TreeViewer />
        </div>
    );
};

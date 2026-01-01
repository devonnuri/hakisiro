import React from 'react';
import clsx from 'clsx';

interface PanelProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, children, className, actions }) => {
  return (
    <div className={clsx('panel', className)}>
      {(title || actions) && (
        <div className="panel-header">
          <span>{title}</span>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="panel-content">{children}</div>
    </div>
  );
};

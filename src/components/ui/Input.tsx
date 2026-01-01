import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, fullWidth, className, ...props }) => {
  return (
    <div
      className={clsx('input-group', fullWidth && 'full-width', className)}
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      {label && (
        <label style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>{label}</label>
      )}
      <input
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          padding: '4px 8px',
          fontSize: '1em'
        }}
        {...props}
      />
    </div>
  );
};

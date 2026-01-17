import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, fullWidth, className, ...props }) => {
  return (
    <div className={clsx('input-group', fullWidth && 'full-width', className)}>
      {label && <label className="input-label">{label}</label>}
      <input className="retro-input" {...props} />
    </div>
  );
};

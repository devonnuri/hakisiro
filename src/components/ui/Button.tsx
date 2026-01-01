import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default';
}

export const Button: React.FC<ButtonProps> = ({ className, children, ...props }) => {
  return (
    <button className={clsx('retro-btn', className)} {...props}>
      {children}
    </button>
  );
};

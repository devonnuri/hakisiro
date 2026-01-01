import React from 'react';
import { Button } from '../ui/Button';

interface ProgressControlProps {
  value: number; // 0.0 - 1.0
  onChange: (newValue: number) => void;
}

export const ProgressControl: React.FC<ProgressControlProps> = ({ value, onChange }) => {
  // Clamp helper
  const clamp = (v: number) => Math.max(0, Math.min(10, v));

  // Display as raw float
  const displayVal = (value / 10).toFixed(1);

  const handleStep = (step: number) => {
    const next = clamp(value + step);
    if (next !== value) onChange(next);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleStep(-1);
        }}
        style={{ padding: '0px 6px', fontSize: '10px' }}
      >
        -
      </Button>
      <div style={{ width: 32, textAlign: 'center', fontSize: '0.9em' }}>{displayVal}</div>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleStep(1);
        }}
        style={{ padding: '0px 6px', fontSize: '10px' }}
      >
        +
      </Button>
    </div>
  );
};

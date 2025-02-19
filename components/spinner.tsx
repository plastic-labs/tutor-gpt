import React from 'react';
import { FaCircleNotch } from 'react-icons/fa';

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner = ({ size = 24, color = '#000000' }: SpinnerProps) => {
  const spinnerStyle = {
    animation: 'spin 1s linear infinite',
    color: color,
    fontSize: `${size}px`,
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <FaCircleNotch style={spinnerStyle} />
    </div>
  );
};

export default Spinner;

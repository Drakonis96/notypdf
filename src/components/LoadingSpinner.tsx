import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 24, 
  color = '#007bff' 
}) => {
  return (
    <div style={{ 
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      margin: '0 8px'
    }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'spin 1s linear infinite',
          marginRight: '8px'
        }}
      >
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="32"
          strokeDashoffset="12"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;
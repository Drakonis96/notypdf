import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessMessageProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ 
  message, 
  duration = 5000, 
  onClose 
}) => {
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return visible ? (
    <div className="success-message" style={{
      backgroundColor: '#e6f7e6',
      color: '#2e7d32',
      padding: '10px 16px',
      borderRadius: '4px',
      marginBottom: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      animation: 'fadeInOut 5s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
        `}
      </style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle size={18} />
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: '#2e7d32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <X size={16} />
      </button>
    </div>
  ) : null;
};

export default SuccessMessage;

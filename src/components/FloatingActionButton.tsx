import React, { useState } from 'react';
import { Settings, FileText, MessageCircle, Plus, X } from 'lucide-react';
import './FloatingActionButton.css';

interface FloatingActionButtonProps {
  onSettingsClick: () => void;
  onDocumentManagerClick: () => void;
  onChatClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onSettingsClick,
  onDocumentManagerClick,
  onChatClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleActionClick = (callback: () => void) => {
    callback();
    setIsExpanded(false);
  };

  return (
    <div className={`fab-container ${isExpanded ? 'expanded' : ''}`}>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fab-backdrop" 
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Secondary Action Buttons */}
      <div className="fab-actions">
        <button
          className="fab-action-btn fab-action-documents"
          onClick={() => handleActionClick(onDocumentManagerClick)}
          aria-label="Document Manager"
          title="Document Manager"
        >
          <FileText size={20} />
        </button>

        <button
          className="fab-action-btn fab-action-chat"
          onClick={() => handleActionClick(onChatClick)}
          aria-label="Chat"
          title="Chat"
        >
          <MessageCircle size={20} />
        </button>
        
        <button
          className="fab-action-btn fab-action-settings"
          onClick={() => handleActionClick(onSettingsClick)}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
      
      {/* Main FAB Button */}
      <button
        className="fab-main-btn"
        onClick={toggleExpanded}
        aria-label={isExpanded ? 'Close menu' : 'Open menu'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
};

export default FloatingActionButton;

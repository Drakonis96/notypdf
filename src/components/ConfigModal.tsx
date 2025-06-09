import React, { useState } from 'react';
import { Settings, Database, Archive, X, HelpCircle, Tag } from 'lucide-react';
import ConfigPanel from './ConfigPanel';
import DatabaseIdPanel from './DatabaseIdPanel';
import BackupPanel from './BackupPanel';
import HelpModal from './HelpModal';
import TagConfigPanel from './TagConfigPanel';
import { NotionConfig, TranslationConfig, SavedDatabaseId } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotionConfig;
  onConfigChange: (config: NotionConfig) => void;
  selectedText: string;
  translationConfig: TranslationConfig;
  setTranslationConfig: (config: TranslationConfig) => void;
  onClearSelection?: () => void;
  fullscreenContainer?: HTMLElement | null;
  savedDatabaseIds?: SavedDatabaseId[];
  onDatabaseIdSave?: (databaseId: SavedDatabaseId) => void;
  refreshDatabaseIds?: () => void;
  onSendToChat?: (text: string) => void;
}

type TabType = 'configuration' | 'database-ids' | 'tag-config' | 'backup';

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  selectedText,
  translationConfig,
  setTranslationConfig,
  onClearSelection,
  fullscreenContainer,
  savedDatabaseIds,
  onDatabaseIdSave,
  refreshDatabaseIds,
  onSendToChat
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('configuration');
  const [showHelpModal, setShowHelpModal] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 'configuration' as TabType, label: 'Configuration', icon: Settings },
    { id: 'database-ids' as TabType, label: 'Database IDs', icon: Database },
    { id: 'tag-config' as TabType, label: 'Tag Config', icon: Tag }, // Cambiado a Tag
    { id: 'backup' as TabType, label: 'Backup', icon: Archive },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'configuration':
        return (
          <ConfigPanel
            config={config}
            onConfigChange={onConfigChange}
            selectedText={selectedText}
            translationConfig={translationConfig}
            setTranslationConfig={setTranslationConfig}
            onClearSelection={onClearSelection}
            fullscreenContainer={fullscreenContainer}
          savedDatabaseIds={savedDatabaseIds}
          refreshDatabaseIds={refreshDatabaseIds}
          isConfigModalOpen={isOpen}
          onSendToChat={onSendToChat}
        />
        );
      case 'database-ids':
        return (
          <DatabaseIdPanel
            onDatabaseIdSave={onDatabaseIdSave}
            refreshDatabaseIds={refreshDatabaseIds}
          />
        );
      case 'tag-config':
        return <TagConfigPanel savedDatabaseIds={savedDatabaseIds} isActive={activeTab === 'tag-config'} />;
      case 'backup':
        return <BackupPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="config-modal-overlay" onClick={onClose}>
      <div className="config-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with Help and Close buttons */}
        <div className="config-modal-header">
          <div className="config-modal-header-actions">
            <button
              onClick={() => setShowHelpModal(true)}
              className="config-action-btn config-help-btn"
              aria-label="Open help guide"
              title="Help Guide"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={onClose}
              className="config-action-btn config-close-btn"
              aria-label="Close configuration panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="config-modal-tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`config-tab ${activeTab === tab.id ? 'config-tab-active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Refresh database IDs when changing tabs
                  if (refreshDatabaseIds) {
                    refreshDatabaseIds();
                  }
                }}
              >
                <IconComponent size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="config-modal-content">
          {renderTabContent()}
        </div>
        
        {/* Help Modal */}
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      </div>
    </div>
  );
};

export default ConfigModal;

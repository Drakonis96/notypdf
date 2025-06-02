import React, { useState, useRef } from 'react';
import { Download, Upload, RefreshCw, AlertCircle, CheckCircle, FileText, Trash2 } from 'lucide-react';
import configService from '../services/configService';
import ConfirmationModal from './ConfirmationModal';

const BackupPanel: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    setMessage(null);

    try {
      const blob = await configService.downloadBackup();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      a.download = `notypdf_backup_${timestamp}.json`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
    } catch (error) {
      console.error('Error downloading backup:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Please select a valid JSON backup file.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const result = await configService.restoreBackup(file);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Backup restored successfully! Please refresh the page to see the changes.' });
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Optionally reload the page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error uploading backup:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearConfig = async () => {
    setIsClearing(true);
    setMessage(null);

    try {
      const result = await configService.clearConfig();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'All configurations cleared successfully! Please refresh the page to see the changes.' });
        
        // Optionally reload the page after a delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to clear configurations' });
      }
    } catch (error) {
      console.error('Error clearing config:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to clear configurations: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsClearing(false);
      setShowConfirmModal(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return (
    <div className="backup-panel">
      <div className="backup-header">
        <h3>Backup & Restore</h3>
        <p className="backup-description">
          Export your database IDs and column mappings as a backup file, or restore from a previous backup.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`backup-message backup-message-${message.type}`}>
          <div className="backup-message-icon">
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="backup-message-content">
            <span>{message.text}</span>
            <button onClick={clearMessage} className="backup-message-close">×</button>
          </div>
        </div>
      )}

      <div className="backup-actions">
        {/* Download Backup */}
        <div className="backup-action-card">
          <div className="backup-action-header">
            <FileText size={24} className="backup-action-icon" />
            <div>
              <h4>Download Backup</h4>
              <p>Export your current configuration as a JSON file</p>
            </div>
          </div>
          <button
            onClick={handleDownloadBackup}
            disabled={isDownloading}
            className="backup-btn backup-btn-primary"
          >
            {isDownloading ? (
              <>
                <RefreshCw size={18} className="backup-btn-spinner" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download Backup</span>
              </>
            )}
          </button>
        </div>

        {/* Upload Backup */}
        <div className="backup-action-card">
          <div className="backup-action-header">
            <Upload size={24} className="backup-action-icon" />
            <div>
              <h4>Restore Backup</h4>
              <p>Upload a backup file to restore your configuration</p>
            </div>
          </div>
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="backup-btn backup-btn-secondary"
          >
            {isUploading ? (
              <>
                <RefreshCw size={18} className="backup-btn-spinner" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload Backup</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Clear Configurations */}
        <div className="backup-action-card">
          <div className="backup-action-header">
            <Trash2 size={24} className="backup-action-icon backup-danger-icon" />
            <div>
              <h4>Clear All Configurations</h4>
              <p>Remove all saved database IDs and column mappings</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isClearing}
            className="backup-btn backup-btn-danger"
          >
            {isClearing ? (
              <>
                <RefreshCw size={18} className="backup-btn-spinner" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <Trash2 size={18} />
                <span>Clear All Configurations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Information */}
      <div className="backup-info">
        <h4>What's included in the backup?</h4>
        <ul>
          <li>Saved database IDs with their names and identifiers</li>
          <li>Column mappings for each database (identifier, text, annotation, page columns)</li>
          <li>Document ID insertion settings</li>
          <li>Backup timestamp information</li>
        </ul>
        
        <div className="backup-warning">
          <AlertCircle size={16} />
          <span>
            <strong>Note:</strong> Restoring a backup will overwrite your current configuration. 
            Consider downloading a current backup before restoring.
          </span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleClearConfig}
        title="Clear All Configurations"
        message="Are you sure you want to clear all saved configurations? This action will permanently delete all your saved database IDs and column mappings. This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        isLoading={isClearing}
      />
    </div>
  );
};

export default BackupPanel;
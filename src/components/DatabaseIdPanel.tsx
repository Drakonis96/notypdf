import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { SavedDatabaseId } from '../types';
import configService from '../services/configService';

interface DatabaseIdPanelProps {
  onDatabaseIdSave?: (databaseId: SavedDatabaseId) => void;
  refreshDatabaseIds?: () => void;
}

const DatabaseIdPanel: React.FC<DatabaseIdPanelProps> = ({ onDatabaseIdSave, refreshDatabaseIds }) => {
  const [savedDatabaseIds, setSavedDatabaseIds] = useState<SavedDatabaseId[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showDatabaseId, setShowDatabaseId] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    databaseId: ''
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load saved database IDs from server on component mount
  useEffect(() => {
    const loadDatabaseIds = async () => {
      try {
        const config = await configService.getConfig();
        if (config.savedDatabaseIds) {
          // Convert createdAt strings back to Date objects
          const withDates = config.savedDatabaseIds.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }));
          setSavedDatabaseIds(withDates);
        }
      } catch (err) {
        console.error('Error loading saved database IDs:', err);
        // Fallback to localStorage for migration
        const saved = localStorage.getItem('savedDatabaseIds');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const withDates = parsed.map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt)
            }));
            setSavedDatabaseIds(withDates);
            // Migrate to server
            await configService.updateConfig({ savedDatabaseIds: withDates });
            localStorage.removeItem('savedDatabaseIds');
          } catch (migrationErr) {
            console.error('Error migrating database IDs:', migrationErr);
          }
        }
      }
    };
    
    loadDatabaseIds();
  }, []);

  // Save database IDs to server whenever the list changes
  const saveDatabaseIds = async (databaseIds: SavedDatabaseId[]) => {
    try {
      await configService.updateConfig({ savedDatabaseIds: databaseIds });
      setSavedDatabaseIds(databaseIds);
    } catch (err) {
      console.error('Error saving database IDs to server:', err);
      throw err;
    }
  };

  const handleSaveDatabaseId = async () => {
    if (!formData.name.trim() || !formData.databaseId.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Validate database ID format (32 characters)
    if (formData.databaseId.length !== 32) {
      setError('Database ID must be exactly 32 characters');
      return;
    }

    // Check if name already exists
    if (savedDatabaseIds.some(item => item.name.toLowerCase() === formData.name.toLowerCase())) {
      setError('A database with this name already exists');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newDatabaseId: SavedDatabaseId = {
        id: generateId(),
        name: formData.name.trim(),
        databaseId: formData.databaseId.trim(),
        createdAt: new Date()
      };

      const updatedList = [...savedDatabaseIds, newDatabaseId];
      await saveDatabaseIds(updatedList);

      // Reset form
      setFormData({ name: '', databaseId: '' });
      setShowForm(false);

      // Notify parent component if callback provided
      if (onDatabaseIdSave) {
        onDatabaseIdSave(newDatabaseId);
      }
      
      // Refresh database IDs in parent components
      if (refreshDatabaseIds) {
        refreshDatabaseIds();
      }
    } catch (err: any) {
      setError('Failed to save database ID');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDatabaseId = async (id: string) => {
    try {
      const updatedList = savedDatabaseIds.filter(item => item.id !== id);
      await saveDatabaseIds(updatedList);
      
      // Refresh database IDs in parent components
      if (refreshDatabaseIds) {
        refreshDatabaseIds();
      }
    } catch (err) {
      console.error('Error deleting database ID:', err);
      setError('Failed to delete database ID');
    }
  };

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const toggleShowDatabaseId = (id: string) => {
    setShowDatabaseId(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="database-id-panel">
      <div className="database-id-header">
        <h3>Saved Database IDs</h3>
        <button
          onClick={() => setShowForm(true)}
          className="database-id-add-btn"
          disabled={showForm}
        >
          <Plus size={18} />
          Add Database ID
        </button>
      </div>

      {error && (
        <div className="database-id-error">
          {error}
        </div>
      )}

      {showForm && (
        <div className="database-id-form">
          <h4>Add New Database ID</h4>
          <div className="database-id-form-fields">
            <div className="config-field">
              <label htmlFor="dbName" className="config-label">Name</label>
              <input
                id="dbName"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Project Database"
                className="config-input"
              />
            </div>
            <div className="config-field">
              <label htmlFor="dbId" className="config-label">Database ID</label>
              <input
                id="dbId"
                type="text"
                value={formData.databaseId}
                onChange={(e) => setFormData({ ...formData, databaseId: e.target.value })}
                placeholder="32-character database ID"
                className="config-input"
              />
            </div>
          </div>
          <div className="database-id-form-actions">
            <button
              onClick={handleSaveDatabaseId}
              disabled={saving}
              className="database-id-save-btn"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', databaseId: '' });
                setError('');
              }}
              className="database-id-cancel-btn"
            >
              <X size={18} />
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="database-id-list">
        {savedDatabaseIds.length === 0 ? (
          <div className="database-id-empty">
            <p>No database IDs saved yet.</p>
            <p>Click "Add Database ID" to get started.</p>
          </div>
        ) : (
          savedDatabaseIds.map((item) => (
            <div key={item.id} className="database-id-item">
              <div className="database-id-item-header">
                <h4>{item.name}</h4>
                <div className="database-id-item-actions">
                  <button
                    onClick={() => toggleShowDatabaseId(item.id)}
                    className="database-id-toggle-btn"
                    aria-label={showDatabaseId[item.id] ? 'Hide ID' : 'Show ID'}
                  >
                    {showDatabaseId[item.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteDatabaseId(item.id)}
                    className="database-id-delete-btn"
                    aria-label="Delete database ID"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="database-id-item-content">
                <div className="database-id-value">
                  <span className="database-id-label">ID:</span>
                  <code className="database-id-code">
                    {showDatabaseId[item.id] ? item.databaseId : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
                <div className="database-id-meta">
                  <span className="database-id-date">
                    Added: {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DatabaseIdPanel;

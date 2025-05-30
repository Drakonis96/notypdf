import React, { useState, useEffect, useCallback } from 'react';
import { NotionConfig, NotionProperty, TranslationConfig } from '../types';
import notionService from '../services/notionService';
import translationService from '../services/translationService';
import { Settings, Save, Database, X, HelpCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import SuccessMessage from './SuccessMessage';
import TranslationModal from './TranslationModal';
import HelpModal from './HelpModal';

interface ConfigPanelProps {
  config: NotionConfig;
  onConfigChange: (config: NotionConfig) => void;
  selectedText: string;
  translationConfig: TranslationConfig;
  setTranslationConfig: (config: TranslationConfig) => void;
  onClearSelection?: () => void;
  onClose?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange, selectedText, translationConfig, setTranslationConfig, onClearSelection, onClose }) => {
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [showTranslationModal, setShowTranslationModal] = useState<boolean>(false);
  const [showTextModal, setShowTextModal] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [translating, setTranslating] = useState<boolean>(false);
  const [showDatabaseId, setShowDatabaseId] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Helper: filter for dropdowns (title, rich_text, multi_select)
  const dropdownColumnTypes = ['title', 'rich_text', 'multi_select'];

  const loadProperties = useCallback(async () => {
    if (!config.databaseId) {
      setProperties([]);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const props = await notionService.getDatabaseProperties(config);
      setProperties(props);
    } catch (err: any) {
      console.error('Error loading database properties:', err);
      setError(`Failed to load database properties. ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Auto-translate when text is selected and translation is enabled, or show text modal when not enabled
  useEffect(() => {
    if (
      selectedText.trim() &&
      !showTranslationModal &&
      !showTextModal &&
      !translating
    ) {
      if (translationConfig.enabled) {
        // Translation is enabled - check if fully configured
        if (
          translationConfig.targetLanguage &&
          translationConfig.provider &&
          translationConfig.model
        ) {
          // Translation is fully configured - auto-translate
          const autoTranslate = async () => {
            setTranslating(true);
            setError('');
            try {
              let apiKey = '';
              if (translationConfig.provider === 'openai') apiKey = process.env.OPENAI_API_KEY || (typeof window !== 'undefined' ? window._env_?.OPENAI_API_KEY ?? '' : '');
              if (translationConfig.provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || (typeof window !== 'undefined' ? window._env_?.OPENROUTER_API_KEY ?? '' : '');
              if (translationConfig.provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? window._env_?.GEMINI_API_KEY ?? '' : '');
              if (translationConfig.provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || (typeof window !== 'undefined' ? window._env_?.DEEPSEEK_API_KEY ?? '' : '');
              if (!apiKey) {
                throw new Error('Missing API key for selected translation provider');
              }
              const translated = await translationService.translateText(selectedText, {
                provider: translationConfig.provider,
                model: translationConfig.model,
                apiKey,
                targetLanguage: translationConfig.targetLanguage,
              });
              setTranslatedText(translated);
              setShowTranslationModal(true);
            } catch (err: any) {
              setError('Translation failed: ' + (err.message || ''));
            } finally {
              setTranslating(false);
            }
          };
          autoTranslate();
        } else {
          // Translation is enabled but not fully configured - show translation modal with original text
          setTranslatedText(selectedText);
          setShowTranslationModal(true);
        }
      } else {
        // Translation is disabled - show text modal
        setShowTextModal(true);
      }
    }
  }, [selectedText, translationConfig, showTranslationModal, showTextModal, translating]);

  const handleConfigChange = useCallback((field: keyof NotionConfig, value: string) => {
    const newConfig = { ...config };
    if (field === 'enableDocumentIdInsertion') {
      newConfig.enableDocumentIdInsertion = value === 'true';
    } else {
      newConfig[field] = value;
    }
    onConfigChange(newConfig);
    setSuccess('');
    setError('');
  }, [config, onConfigChange]);

  const handleSaveText = useCallback(async () => {
    if (!selectedText.trim()) {
      setError('No text selected');
      return;
    }
    if (!config.databaseId || !config.identifierColumn || !config.textColumn) {
      setError('Please configure all required fields');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    let textToSave = selectedText;
    try {
      if (translationConfig.enabled && translationConfig.sendMode === 'translated') {
        // Get API key for provider
        let apiKey = '';
        if (translationConfig.provider === 'openai') apiKey = process.env.OPENAI_API_KEY || (typeof window !== 'undefined' ? window._env_?.OPENAI_API_KEY ?? '' : '');
        if (translationConfig.provider === 'openrouter') apiKey = process.env.OPENROUTER_API_KEY || (typeof window !== 'undefined' ? window._env_?.OPENROUTER_API_KEY ?? '' : '');
        if (translationConfig.provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? window._env_?.GEMINI_API_KEY ?? '' : '');
        if (translationConfig.provider === 'deepseek') apiKey = process.env.DEEPSEEK_API_KEY || (typeof window !== 'undefined' ? window._env_?.DEEPSEEK_API_KEY ?? '' : '');
        if (!apiKey) throw new Error('Missing API key for selected translation provider');
        textToSave = await translationService.translateText(selectedText, {
          provider: translationConfig.provider,
          model: translationConfig.model,
          apiKey,
          targetLanguage: translationConfig.targetLanguage,
        });
      }
      const result = await notionService.saveTextWithIdentifier(config, textToSave);
      if (result.success) {
        setSuccess(`Text saved with identifier: ${result.identifier}`);
      } else {
        setError('Failed to save text to Notion');
      }
    } catch (err: any) {
      setError('An error occurred while saving to Notion: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  }, [selectedText, config, translationConfig]);

  const handleSaveFromModal = useCallback(async (textToSave: string, annotationToSave?: string, pageNumberToSave?: string) => {
    if (!config.databaseId || !config.identifierColumn || !config.textColumn) {
      setError('Please configure all required fields');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const configToSave = { ...config };
      if (annotationToSave) configToSave.annotation = annotationToSave;
      if (pageNumberToSave) configToSave.pageNumber = pageNumberToSave;
      const result = await notionService.saveTextWithIdentifier(configToSave, textToSave);
      if (result.success) {
        setSuccess(`Text saved with identifier: ${result.identifier}`);
        setShowTranslationModal(false);
        setShowTextModal(false);
      } else {
        setError('Failed to save text to Notion');
      }
    } catch (err: any) {
      setError('An error occurred while saving to Notion: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleCloseModal = useCallback(() => {
    setShowTranslationModal(false);
    if (onClearSelection) {
      onClearSelection(); // Aquí sí se limpia el texto seleccionado
    }
  }, [onClearSelection]);

  const handleCloseTextModal = useCallback(() => {
    setShowTextModal(false);
    if (onClearSelection) {
      onClearSelection(); // Aquí sí se limpia el texto seleccionado
    }
  }, [onClearSelection]);

  const handleAddEverything = useCallback(() => {
    const textToSave = translationConfig.sendMode === 'translated' ? translatedText : selectedText;
    handleSaveFromModal(textToSave);
    // NO llamar a onClearSelection aquí
  }, [translationConfig.sendMode, translatedText, selectedText, handleSaveFromModal]);

  const handleAddEverythingWithAnnotation = useCallback((annotation: string, pageNumber?: string) => {
    const textToSave = translationConfig.sendMode === 'translated' ? translatedText : selectedText;
    handleSaveFromModal(textToSave, annotation, pageNumber);
    // NO llamar a onClearSelection aquí
  }, [translationConfig.sendMode, translatedText, selectedText, handleSaveFromModal]);

  const handleAddEverythingText = useCallback(() => {
    handleSaveFromModal(selectedText);
    // NO llamar a onClearSelection aquí
  }, [selectedText, handleSaveFromModal]);

  const handleAddEverythingTextWithAnnotation = useCallback((annotation: string, pageNumber?: string) => {
    handleSaveFromModal(selectedText, annotation, pageNumber);
    // NO llamar a onClearSelection aquí
  }, [selectedText, handleSaveFromModal]);

  const handleAddSelection = useCallback((selectedModalText: string) => {
    handleSaveFromModal(selectedModalText);
    // NO llamar a onClearSelection aquí
  }, [handleSaveFromModal]);

  const handleAddSelectionWithAnnotation = useCallback((selectedModalText: string, annotation: string, pageNumber?: string) => {
    handleSaveFromModal(selectedModalText, annotation, pageNumber);
    // NO llamar a onClearSelection aquí
  }, [handleSaveFromModal]);

  const testConnection = useCallback(async () => {
    setTestingConnection(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await notionService.testConnection();
      if (result.success) {
        setSuccess('✅ Notion API connection successful!');
      } else {
        setError(`❌ Connection failed: ${result.message}`);
      }
    } catch (err: any) {
      setError(`❌ Connection test failed: ${err.message || 'Unknown error'}`);
    } finally {
      setTestingConnection(false);
    }
  }, []);

  // Check if API key is available
  const getApiKeyStatus = () => {
    const envKey = process.env.NOTION_API_KEY || (typeof window !== 'undefined' ? window._env_?.NOTION_API_KEY ?? undefined : undefined);
    const windowKey = typeof window !== 'undefined' ? window._env_?.NOTION_API_KEY : undefined;
    return envKey || windowKey;
  };

  return (
    <div className="config-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} />
          <h2 style={{ margin: 0 }}>Configuration</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            style={{
              background: 'none',
              border: '1px solid #2196f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#e3f2fd',
              color: '#2196f3',
              boxShadow: '0 1px 3px rgba(33, 150, 243, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#bbdefb';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 5px rgba(33, 150, 243, 0.3)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e3f2fd';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(33, 150, 243, 0.2)';
            }}
            aria-label="Open help guide"
            title="Help Guide"
          >
            <HelpCircle size={20} />
          </button>
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #e53935',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#fff0f0',
              color: '#e53935',
              boxShadow: '0 1px 3px rgba(229, 57, 53, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#ffebeb';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 5px rgba(229, 57, 53, 0.3)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#fff0f0';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(229, 57, 53, 0.2)';
            }}
            aria-label="Close configuration panel"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <SuccessMessage message={success} onClose={() => setSuccess('')} />}

      <div className="form-group">
        <label>Notion API Key Status</label>
        <div className="notion-status" style={{ 
          padding: '8px', 
          backgroundColor: getApiKeyStatus() ? '#d4edda' : '#f8d7da', 
          borderRadius: '4px',
          color: getApiKeyStatus() ? '#155724' : '#721c24'
        }}>
          {getApiKeyStatus() 
            ? '✅ API Key configured via environment variable' 
            : '❌ API Key not found. Please set NOTION_API_KEY environment variable.'
          }
        </div>
        {getApiKeyStatus() && (
          <>
            <button
              className="btn"
              onClick={testConnection}
              disabled={testingConnection}
              style={{ marginTop: '8px', width: '100%' }}
            >
              {testingConnection ? (
                <>
                  <LoadingSpinner size={16} />
                  Testing...
                </>
              ) : (
                '🔗 Test Notion Connection'
              )}
            </button>
            <button
              className="btn"
              onClick={loadProperties}
              disabled={!config.databaseId || loading}
              style={{ marginTop: '8px', width: '100%' }}
            >
              {loading ? (
                <>
                  <LoadingSpinner size={16} />
                  Loading...
                </>
              ) : (
                <>
                  <Database size={16} style={{ marginRight: '8px' }} />
                  Load Database Properties
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="databaseId">Database ID</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="databaseId"
            type={showDatabaseId ? 'text' : 'password'}
            value={config.databaseId}
            onChange={(e) => handleConfigChange('databaseId', e.target.value)}
            placeholder="32-character database ID"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            aria-label={showDatabaseId ? 'Ocultar ID' : 'Mostrar ID'}
            onClick={() => setShowDatabaseId((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            tabIndex={0}
          >
            {showDatabaseId ? (
              // Eye-off SVG
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7.5a11.05 11.05 0 0 1 5.17-5.92"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5c.96 0 1.84-.38 2.47-1"/></svg>
            ) : (
              // Eye SVG
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="identifierPattern">Identifier Pattern</label>
        <input
          id="identifierPattern"
          type="text"
          value={config.identifierPattern}
          onChange={(e) => handleConfigChange('identifierPattern', e.target.value)}
          placeholder="e.g., LV001_RF001"
        />
      </div>

      <div className="form-group">
        <label htmlFor="annotation">Add Annotation</label>
        <textarea
          id="annotation"
          value={config.annotation}
          onChange={(e) => handleConfigChange('annotation', e.target.value)}
          placeholder="Add your annotation here (optional)"
          rows={3}
          style={{
            width: '100%',
            minHeight: '60px',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: '14px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      <div className="form-group">
        <label htmlFor="pageNumber">Add Page Number</label>
        <input
          id="pageNumber"
          type="text"
          value={config.pageNumber || ''}
          onChange={(e) => handleConfigChange('pageNumber', e.target.value)}
          placeholder="Enter page number (optional)"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {loading && (
        <div className="loading">Loading database properties...</div>
      )}

      {properties.length > 0 && (
        <>
          <div className="form-group">
            <label htmlFor="identifierColumn">Identifier Column</label>
            <select
              id="identifierColumn"
              value={config.identifierColumn}
              onChange={(e) => handleConfigChange('identifierColumn', e.target.value)}
            >
              <option value="">Select column for identifier</option>
              {properties
                .filter(prop => dropdownColumnTypes.includes(prop.type))
                .map(prop => (
                  <option key={prop.id} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="textColumn">Text Column</label>
            <select
              id="textColumn"
              value={config.textColumn}
              onChange={(e) => handleConfigChange('textColumn', e.target.value)}
            >
              <option value="">Select column for text</option>
              {properties
                .filter(prop => dropdownColumnTypes.includes(prop.type))
                .map(prop => (
                  <option key={prop.id} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="annotationColumn">Annotation Column</label>
            <select
              id="annotationColumn"
              value={config.annotationColumn}
              onChange={(e) => handleConfigChange('annotationColumn', e.target.value)}
            >
              <option value="">Select column for annotations (optional)</option>
              {properties
                .filter(prop => dropdownColumnTypes.includes(prop.type))
                .map(prop => (
                  <option key={prop.id} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pageColumn">Page Column</label>
            <select
              id="pageColumn"
              value={config.pageColumn}
              onChange={(e) => handleConfigChange('pageColumn', e.target.value)}
            >
              <option value="">Select column for page numbers (optional)</option>
              {properties
                .filter(prop => dropdownColumnTypes.includes(prop.type))
                .map(prop => (
                  <option key={prop.id} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
            </select>
          </div>

          {/* New: Document identifier insertion column */}
          <div className="form-group">
            <label htmlFor="documentIdInsertionColumn">Document identifier insertion column</label>
            <select
              id="documentIdInsertionColumn"
              value={config.documentIdInsertionColumn || ''}
              onChange={e => handleConfigChange('documentIdInsertionColumn', e.target.value)}
            >
              <option value="">Select column for document ID insertion (usually multi-select)</option>
              {properties
                .filter(prop => dropdownColumnTypes.includes(prop.type))
                .map(prop => (
                  <option key={prop.id} value={prop.name}>
                    {prop.name} ({prop.type})
                  </option>
                ))}
            </select>
          </div>

          {/* New: Enable document ID insertion checkbox */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              id="enableDocumentIdInsertion"
              checked={!!config.enableDocumentIdInsertion}
              onChange={e => handleConfigChange('enableDocumentIdInsertion', e.target.checked ? 'true' : '')}
              style={{ marginRight: 8, width: 18, height: 18 }}
            />
            <label htmlFor="enableDocumentIdInsertion" style={{ margin: 0, fontWeight: 500, fontSize: 15 }}>
              Enable document ID insertion
            </label>
          </div>
        </>
      )}

      {selectedText && (
        <div>
          <h3>Selected Text</h3>
          <div className="selected-text">
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
              {selectedText.length > 200 ? `${selectedText.substring(0, 200)}...` : selectedText}
            </p>
          </div>
          
          {translationConfig.enabled ? (
            <div style={{ marginTop: '10px' }}>
              {translating && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#1976d2'
                }}>
                  <LoadingSpinner size={16} />
                  Translating to {translationConfig.targetLanguage}...
                </div>
              )}
              
              <button
                className="btn"
                onClick={handleSaveText}
                disabled={saving || !config.identifierColumn || !config.textColumn}
                style={{ width: '100%', backgroundColor: '#6c757d' }}
              >
                {saving ? (
                  <>
                    <LoadingSpinner size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} style={{ marginRight: '8px' }} />
                    Save Original to Notion
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              className="btn"
              onClick={handleSaveText}
              disabled={saving || !config.identifierColumn || !config.textColumn}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {saving ? (
                <>
                  <LoadingSpinner size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  Save to Notion
                </>
              )}
            </button>
          )}
        </div>
      )}

      <TranslationModal
        isOpen={showTranslationModal}
        onClose={handleCloseModal}
        originalText={selectedText}
        translatedText={translatedText}
        onAddEverything={handleAddEverything}
        onAddSelection={handleAddSelection}
        translationConfig={translationConfig}
        annotation={config.annotation}
        pageNumber={config.pageNumber}
        onAddEverythingWithAnnotation={handleAddEverythingWithAnnotation}
        onAddSelectionWithAnnotation={handleAddSelectionWithAnnotation}
      />

      <TranslationModal
        isOpen={showTextModal}
        onClose={handleCloseTextModal}
        originalText={selectedText}
        translatedText={selectedText}
        onAddEverything={handleAddEverythingText}
        onAddSelection={handleAddSelection}
        translationConfig={{ ...translationConfig, enabled: false }}
        annotation={config.annotation}
        pageNumber={config.pageNumber}
        onAddEverythingWithAnnotation={handleAddEverythingTextWithAnnotation}
        onAddSelectionWithAnnotation={handleAddSelectionWithAnnotation}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default ConfigPanel;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NotionConfig, NotionProperty, TranslationConfig, TranslationProvider, TranslationModel, OpenAIModel, OpenRouterModel, GeminiModel, SavedDatabaseId } from '../types';
import notionService from '../services/notionService';
import translationService from '../services/translationService';
import configService from '../services/configService';
import apiKeyService from '../services/apiKeyService';
import { Save, Database, Eye, EyeOff, TestTube } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import SuccessMessage from './SuccessMessage';
import TranslationModal from './TranslationModal';

interface ConfigPanelProps {
  config: NotionConfig;
  onConfigChange: (config: NotionConfig) => void;
  selectedText: string;
  translationConfig: TranslationConfig;
  setTranslationConfig: (config: TranslationConfig) => void;
  onClearSelection?: () => void;
  fullscreenContainer?: HTMLElement | null;
  savedDatabaseIds?: SavedDatabaseId[];
  refreshDatabaseIds?: () => void;
  isConfigModalOpen?: boolean; // New prop to indicate if config modal is open
}

// Translation options constants
const OPENAI_MODELS: { label: string; value: OpenAIModel }[] = [
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4.1-mini', value: 'gpt-4.1-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
];

const OPENROUTER_MODELS: { label: string; value: OpenRouterModel }[] = [
  { label: 'Gemma 3 27B IT (free)', value: 'google/gemma-3-27b-it:free' },
  { label: 'Gemini 2.0 Flash Exp (free)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Llama 4 Maverick (free)', value: 'meta-llama/llama-4-maverick:free' },
  { label: 'Llama 4 Scout (free)', value: 'meta-llama/llama-4-scout:free' },
  { label: 'DeepSeek Chat v3 (free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Qwen 3 32B (free)', value: 'qwen/qwen3-32b:free' },
  { label: 'Mistral Small 3.1 (free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
];

const GEMINI_MODELS: { label: string; value: GeminiModel }[] = [
  { label: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
];

const DEEPSEEK_MODELS: { label: string; value: 'deepseek-chat' | 'deepseek-reasoner' }[] = [
  { label: 'DeepSeek Chat', value: 'deepseek-chat' },
  { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
];

const LANGUAGE_OPTIONS = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Hindi', 'Other...'
];

const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  config, 
  onConfigChange, 
  selectedText, 
  translationConfig, 
  setTranslationConfig, 
  onClearSelection, 
  fullscreenContainer, 
  savedDatabaseIds, 
  refreshDatabaseIds,
  isConfigModalOpen = false // Default to false for backward compatibility
}) => {
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
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');

  // Helper: filter for dropdowns (title, rich_text, multi_select)
  const dropdownColumnTypes = ['title', 'rich_text', 'multi_select'];

  // Helper: get model options based on provider
  const getModelOptions = () => {
    switch (translationConfig.provider) {
      case 'openai':
        return OPENAI_MODELS;
      case 'openrouter':
        return OPENROUTER_MODELS;
      case 'gemini':
        return GEMINI_MODELS;
      case 'deepseek':
        return DEEPSEEK_MODELS;
      default:
        return [];
    }
  };

  // Helper: handle provider change with default model selection
  const handleProviderChange = (provider: TranslationProvider) => {
    let defaultModel: TranslationModel = '';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    if (provider === 'openrouter') defaultModel = 'google/gemma-3-27b-it:free';
    if (provider === 'gemini') defaultModel = 'gemini-2.0-flash';
    if (provider === 'deepseek') defaultModel = 'deepseek-chat';
    
    setTranslationConfig({ 
      ...translationConfig, 
      provider, 
      model: defaultModel 
    });
  };

  // Helper: handle translation enabled change with default language selection
  const handleTranslationEnabledChange = (enabled: boolean) => {
    if (enabled) {
      // When enabling translation, set defaults
      const newConfig = { 
        ...translationConfig, 
        enabled,
        sendMode: 'translated' as 'translated' // Default to translated when translation is enabled
      };
      
      // If no target language is set, default to Spanish
      if (!translationConfig.targetLanguage) {
        newConfig.targetLanguage = 'Spanish';
      }
      
      setTranslationConfig(newConfig);
    } else {
      // When disabling translation, set sendMode back to original
      setTranslationConfig({ 
        ...translationConfig, 
        enabled,
        sendMode: 'original' as 'original'
      });
    }
  };

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

  // Load saved column mapping when database ID changes
  const loadColumnMapping = useCallback(async (databaseId: string, currentConfig: NotionConfig) => {
    if (!databaseId) return;
    
    try {
      const serverConfig = await configService.getConfig();
      const savedMapping = serverConfig.columnMappings[databaseId];
      
      if (savedMapping) {
        console.log('Loading saved column mapping for database:', databaseId);
        
        // Merge the saved mapping with current config
        const updatedConfig = {
          ...currentConfig,
          databaseId,
          identifierColumn: savedMapping.identifierColumn || '',
          textColumn: savedMapping.textColumn || '',
          annotationColumn: savedMapping.annotationColumn || '',
          pageColumn: savedMapping.pageColumn || '',
          documentIdInsertionColumn: savedMapping.documentIdInsertionColumn || '',
          enableDocumentIdInsertion: savedMapping.enableDocumentIdInsertion || false,
          identifierPattern: savedMapping.identifierPattern || '',
          annotation: savedMapping.annotation || '',
          pageNumber: savedMapping.pageNumber || ''
        };
        
        onConfigChange(updatedConfig);
      }
    } catch (error) {
      console.error('Error loading column mapping:', error);
    }
  }, [onConfigChange]);

  // Load column mapping when database ID changes
  const prevDatabaseIdRef = useRef<string>('');
  useEffect(() => {
    if (config.databaseId && config.databaseId !== prevDatabaseIdRef.current) {
      prevDatabaseIdRef.current = config.databaseId;
      loadColumnMapping(config.databaseId, config);
    }
  }, [config.databaseId, loadColumnMapping]);

  // Auto-translate when text is selected and translation is enabled, or show text modal when not enabled
  // Only handle text selection if config modal is NOT open (let app-level modal handle it instead)
  useEffect(() => {
    if (
      selectedText.trim() &&
      !showTranslationModal &&
      !showTextModal &&
      !translating &&
      !isConfigModalOpen // Don't handle text selection when config modal is open
    ) {
      // Limpiar selección visual antes de mostrar el modal
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
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
              const apiKey = await apiKeyService.getApiKey(translationConfig.provider);
              if (!apiKey) {
                throw new Error('Missing API key for selected translation provider');
              }

              // Use streaming for OpenAI, OpenRouter, Gemini, and DeepSeek
              if (translationConfig.provider === 'openai' || translationConfig.provider === 'openrouter' || translationConfig.provider === 'gemini' || translationConfig.provider === 'deepseek') {
                // Open modal immediately for streaming
                setIsStreaming(true);
                setStreamingText('');
                setTranslatedText('');
                setShowTranslationModal(true);

                await translationService.translateTextStreaming(selectedText, {
                  provider: translationConfig.provider,
                  model: translationConfig.model,
                  apiKey,
                  targetLanguage: translationConfig.targetLanguage,
                  onProgress: (partialText: string) => {
                    setStreamingText(partialText);
                  },
                  onComplete: (fullText: string) => {
                    setTranslatedText(fullText);
                    setIsStreaming(false);
                    setStreamingText('');
                  },
                  onError: (error: Error) => {
                    setError('Translation failed: ' + error.message);
                    setIsStreaming(false);
                    setStreamingText('');
                  }
                });
              } else {
                // Fallback to regular translation for other providers
                const translated = await translationService.translateText(selectedText, {
                  provider: translationConfig.provider,
                  model: translationConfig.model,
                  apiKey,
                  targetLanguage: translationConfig.targetLanguage,
                });
                setTranslatedText(translated);
                setShowTranslationModal(true);
              }
            } catch (err: any) {
              setError('Translation failed: ' + (err.message || ''));
              setIsStreaming(false);
              setStreamingText('');
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
  }, [selectedText, translationConfig, showTranslationModal, showTextModal, translating, isStreaming, isConfigModalOpen]);

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
    
    // Save column mapping to server when database ID or column configuration changes
    if (newConfig.databaseId && (
      field === 'identifierColumn' || 
      field === 'textColumn' || 
      field === 'annotationColumn' || 
      field === 'pageColumn' || 
      field === 'documentIdInsertionColumn' ||
      field === 'enableDocumentIdInsertion' ||
      field === 'identifierPattern' ||
      field === 'annotation' ||
      field === 'pageNumber'
    )) {
      const columnMapping = {
        identifierColumn: newConfig.identifierColumn,
        textColumn: newConfig.textColumn,
        annotationColumn: newConfig.annotationColumn,
        pageColumn: newConfig.pageColumn,
        documentIdInsertionColumn: newConfig.documentIdInsertionColumn,
        enableDocumentIdInsertion: newConfig.enableDocumentIdInsertion,
        identifierPattern: newConfig.identifierPattern,
        annotation: newConfig.annotation,
        pageNumber: newConfig.pageNumber
      };
      
      // Save to server asynchronously
      configService.saveColumnMapping(newConfig.databaseId, columnMapping)
        .then(result => {
          if (result.success) {
            console.log('Column mapping saved to server');
          } else {
            console.error('Failed to save column mapping:', result.message);
          }
        })
        .catch(err => {
          console.error('Error saving column mapping:', err);
        });
    }
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
        const apiKey = await apiKeyService.getApiKey(translationConfig.provider);
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
        // Limpiar el mensaje de éxito después de 3 segundos
        setTimeout(() => {
          setSuccess('');
        }, 3000);
        // NO cerrar el modal automáticamente - mantener la traducción visible
        // setShowTranslationModal(false);
        // setShowTextModal(false);
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
    setIsStreaming(false);
    setStreamingText('');
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

  return (
    <div className="config-panel-modern">
      <div className="config-content">
        {/* Status Messages */}
        {error && <div className="config-message config-error">{error}</div>}
        {success && <SuccessMessage message={success} onClose={() => setSuccess('')} />}

        {/* Small padding before content */}
        <div style={{ paddingTop: '16px' }} />

        {/* Content */}
        <div className="config-content">
          {/* API Key Status */}
          <div className="config-section">
            <h3 className="config-section-title">Notion API Connection</h3>
            <div className="api-status api-status-info">
              <div className="api-status-indicator">
                🔑
              </div>
              <div className="api-status-text">
                API Key configured on server
              </div>
            </div>
            
            <div className="config-actions">
              <button
                className="config-btn config-btn-secondary"
                style={{ color: '#fff' }}
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <LoadingSpinner size={16} color="#fff" />
                    <span style={{ color: '#fff' }}>Testing...</span>
                  </>
                ) : (
                  <>
                    <TestTube size={16} style={{ color: '#fff' }} />
                    <span style={{ color: '#fff' }}>Test Connection</span>
                  </>
                )}
              </button>
                <button
                  className="config-btn config-btn-primary"
                  style={{ color: '#fff' }}
                  onClick={loadProperties}
                  disabled={!config.databaseId || loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size={16} color="#fff" />
                      <span style={{ color: '#fff' }}>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Database size={16} style={{ color: '#fff' }} />
                      <span style={{ color: '#fff' }}>Load Properties</span>
                    </>
                  )}
                </button>
              </div>
          </div>

          {/* Database Configuration */}
          <div className="config-section">
            <h3 className="config-section-title">Database Configuration</h3>
            
            <div className="config-field">
              <label htmlFor="databaseId" className="config-label">Database ID</label>
              {savedDatabaseIds && savedDatabaseIds.length > 0 ? (
                <select
                  id="databaseId"
                  value={config.databaseId}
                  onChange={(e) => handleConfigChange('databaseId', e.target.value)}
                  className="config-select"
                >
                  <option value="">Select a saved database ID</option>
                  {savedDatabaseIds.map((item) => (
                    <option key={item.id} value={item.databaseId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="config-input-group">
                  <input
                    id="databaseId"
                    type={showDatabaseId ? 'text' : 'password'}
                    value={config.databaseId}
                    onChange={(e) => handleConfigChange('databaseId', e.target.value)}
                    placeholder="32-character database ID"
                    className="config-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDatabaseId(!showDatabaseId)}
                    className="config-input-action"
                    aria-label={showDatabaseId ? 'Hide ID' : 'Show ID'}
                  >
                    {showDatabaseId ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
              {savedDatabaseIds && savedDatabaseIds.length === 0 && (
                <p className="config-field-hint">
                  No database IDs saved yet. Go to the "Database IDs" tab to add one.
                </p>
              )}
            </div>

            <div className="config-field">
              <label htmlFor="identifierPattern" className="config-label">Identifier Pattern</label>
              <input
                id="identifierPattern"
                type="text"
                value={config.identifierPattern}
                onChange={(e) => handleConfigChange('identifierPattern', e.target.value)}
                placeholder="e.g., LV001_RF001"
                className="config-input"
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="config-section">
            <h3 className="config-section-title">Optional Information</h3>
            
            <div className="config-field">
              <label htmlFor="annotation" className="config-label">Add Annotation</label>
              <textarea
                id="annotation"
                value={config.annotation}
                onChange={(e) => handleConfigChange('annotation', e.target.value)}
                placeholder="Add your annotation here (optional)"
                rows={3}
                className="config-textarea"
              />
            </div>

            <div className="config-field">
              <label htmlFor="pageNumber" className="config-label">Page Number</label>
              <input
                id="pageNumber"
                type="text"
                value={config.pageNumber || ''}
                onChange={(e) => handleConfigChange('pageNumber', e.target.value)}
                placeholder="Enter page number (optional)"
                className="config-input"
              />
            </div>
          </div>

          {/* Translation Configuration */}
          <div className="config-section">
            <h3 className="config-section-title">Translation Options</h3>
            
            <div className="config-checkbox">
              <input
                type="checkbox"
                id="translationEnabled"
                checked={translationConfig.enabled}
                onChange={(e) => handleTranslationEnabledChange(e.target.checked)}
                className="config-checkbox-input"
              />
              <label htmlFor="translationEnabled" className="config-checkbox-label">
                Enable translation
              </label>
            </div>

            {translationConfig.enabled && (
              <>
                <div className="config-field">
                  <label htmlFor="translationProvider" className="config-label">Translation Provider</label>
                  <select
                    id="translationProvider"
                    value={translationConfig.provider}
                    onChange={(e) => handleProviderChange(e.target.value as TranslationProvider)}
                    className="config-select"
                  >
                    <option value="">Select provider</option>
                    <option value="openai">OpenAI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="gemini">Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>

                <div className="config-field">
                  <label htmlFor="translationModel" className="config-label">Model</label>
                  <select
                    id="translationModel"
                    value={translationConfig.model}
                    onChange={(e) => setTranslationConfig({ ...translationConfig, model: e.target.value as TranslationModel })}
                    className="config-select"
                  >
                    <option value="">Select model</option>
                    {getModelOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="config-field">
                  <label htmlFor="targetLanguage" className="config-label">Target Language</label>
                  <select
                    id="targetLanguage"
                    value={translationConfig.targetLanguage}
                    onChange={(e) => setTranslationConfig({ ...translationConfig, targetLanguage: e.target.value })}
                    className="config-select"
                  >
                    <option value="">Select language</option>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div className="config-field">
                  <label htmlFor="sendMode" className="config-label">Send Mode</label>
                  <select
                    id="sendMode"
                    value={translationConfig.sendMode}
                    onChange={(e) => setTranslationConfig({ ...translationConfig, sendMode: e.target.value as any })}
                    className="config-select"
                  >
                    <option value="original">Send original text</option>
                    <option value="translated">Send translated text</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Database Properties */}
          {loading && (
            <div className="config-loading">
              <LoadingSpinner size={20} />
              <span>Loading database properties...</span>
            </div>
          )}

          {properties.length > 0 && (
            <div className="config-section">
              <h3 className="config-section-title">Column Mapping</h3>
              
              <div className="config-field">
                <label htmlFor="identifierColumn" className="config-label config-label-required">
                  Identifier Column
                </label>
                <select
                  id="identifierColumn"
                  value={config.identifierColumn}
                  onChange={(e) => handleConfigChange('identifierColumn', e.target.value)}
                  className="config-select"
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

              <div className="config-field">
                <label htmlFor="textColumn" className="config-label config-label-required">
                  Text Column
                </label>
                <select
                  id="textColumn"
                  value={config.textColumn}
                  onChange={(e) => handleConfigChange('textColumn', e.target.value)}
                  className="config-select"
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

              <div className="config-field">
                <label htmlFor="annotationColumn" className="config-label">
                  Annotation Column
                </label>
                <select
                  id="annotationColumn"
                  value={config.annotationColumn}
                  onChange={(e) => handleConfigChange('annotationColumn', e.target.value)}
                  className="config-select"
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

              <div className="config-field">
                <label htmlFor="pageColumn" className="config-label">
                  Page Column
                </label>
                <select
                  id="pageColumn"
                  value={config.pageColumn}
                  onChange={(e) => handleConfigChange('pageColumn', e.target.value)}
                  className="config-select"
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

              <div className="config-field">
                <label htmlFor="documentIdInsertionColumn" className="config-label">
                  Document ID Column
                </label>
                <select
                  id="documentIdInsertionColumn"
                  value={config.documentIdInsertionColumn || ''}
                  onChange={e => handleConfigChange('documentIdInsertionColumn', e.target.value)}
                  className="config-select"
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

              <div className="config-checkbox">
                <input
                  type="checkbox"
                  id="enableDocumentIdInsertion"
                  checked={!!config.enableDocumentIdInsertion}
                  onChange={e => handleConfigChange('enableDocumentIdInsertion', e.target.checked ? 'true' : '')}
                  className="config-checkbox-input"
                />
                <label htmlFor="enableDocumentIdInsertion" className="config-checkbox-label">
                  Enable document ID insertion
                </label>
              </div>
            </div>
          )}

          {/* Selected Text */}
          {selectedText && (
            <div className="config-section config-selected-text">
              <h3 className="config-section-title">Selected Text</h3>
              <div className="selected-text-preview">
                <p className="selected-text-content">
                  {selectedText.length > 200 ? `${selectedText.substring(0, 200)}...` : selectedText}
                </p>
              </div>
              
              {translationConfig.enabled ? (
                <div className="config-translation-actions">
                  {translating && (
                    <div className="translation-status">
                      <LoadingSpinner size={16} />
                      <span>Translating to {translationConfig.targetLanguage}...</span>
                    </div>
                  )}
                  
                  <button
                    className="config-btn config-btn-save"
                    onClick={handleSaveText}
                    disabled={saving || !config.identifierColumn || !config.textColumn}
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size={16} />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Original to Notion</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  className="config-btn config-btn-save"
                  onClick={handleSaveText}
                  disabled={saving || !config.identifierColumn || !config.textColumn}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save to Notion</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
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
          isStreaming={isStreaming}
          streamingText={streamingText}
          portalContainer={document.body} // Ensures modal is portalled to the body
          success={success}
          saving={saving}
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
          isStreaming={false}
          streamingText=""
          portalContainer={fullscreenContainer}
          success={success}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default ConfigPanel;

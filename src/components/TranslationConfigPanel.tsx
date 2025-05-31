import React from 'react';
import { TranslationConfig, TranslationProvider, TranslationModel, OpenAIModel, OpenRouterModel, GeminiModel } from '../types';

const PROVIDER_OPTIONS: { label: string; value: TranslationProvider }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'DeepSeek', value: 'deepseek' },
];

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

interface TranslationConfigPanelProps {
  config: TranslationConfig;
  onConfigChange: (config: TranslationConfig) => void;
}

const TranslationConfigPanel: React.FC<TranslationConfigPanelProps> = ({ config, onConfigChange }) => {
  const handleChange = (field: keyof TranslationConfig, value: any) => {
    if (field === 'enabled') {
      if (value) {
        // When enabling translation, set defaults
        const newConfig = { 
          ...config, 
          enabled: value,
          sendMode: 'translated' as 'translated' // Default to translated when translation is enabled
        };
        
        // If no target language is set, default to Spanish
        if (!config.targetLanguage) {
          newConfig.targetLanguage = 'Spanish';
        }
        
        onConfigChange(newConfig);
      } else {
        // When disabling translation, set sendMode back to original
        onConfigChange({ ...config, enabled: value, sendMode: 'original' as 'original' });
      }
      return;
    }
    if (field === 'provider') {
      // Set default model for provider
      let defaultModel: TranslationModel = '';
      if (value === 'openai') defaultModel = 'gpt-4o-mini';
      if (value === 'openrouter') defaultModel = 'google/gemma-3-27b-it:free';
      if (value === 'gemini') defaultModel = 'gemini-2.0-flash';
      if (value === 'deepseek') defaultModel = 'deepseek-chat';
      onConfigChange({ ...config, provider: value, model: defaultModel });
      return;
    }
    onConfigChange({ ...config, [field]: value });
  };

  let modelOptions: { label: string; value: TranslationModel }[] = [];
  if (config.provider === 'openai') modelOptions = OPENAI_MODELS;
  if (config.provider === 'openrouter') modelOptions = OPENROUTER_MODELS;
  if (config.provider === 'gemini') modelOptions = GEMINI_MODELS;
  if (config.provider === 'deepseek') modelOptions = DEEPSEEK_MODELS;

  return (
    <div className="translation-config-panel">
      <h3>Translation Options</h3>
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => handleChange('enabled', e.target.checked)}
            className="checkbox-input"
          />
          <span className="checkbox-text">Enable Translation</span>
        </label>
      </div>
      {config.enabled && (
        <>
          <div className="form-group">
            <label htmlFor="targetLanguage">Target Language</label>
            <select
              id="targetLanguage"
              value={config.targetLanguage}
              onChange={e => handleChange('targetLanguage', e.target.value)}
            >
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={config.provider}
              onChange={e => handleChange('provider', e.target.value)}
            >
              <option value="">Select provider</option>
              {PROVIDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={config.model}
              onChange={e => handleChange('model', e.target.value)}
            >
              <option value="">Select model</option>
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Send to Notion</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="sendMode"
                  value="original"
                  checked={config.sendMode === 'original'}
                  onChange={() => handleChange('sendMode', 'original')}
                  className="radio-input"
                />
                <span className="radio-text">Original Text</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="sendMode"
                  value="translated"
                  checked={config.sendMode === 'translated'}
                  onChange={() => handleChange('sendMode', 'translated')}
                  className="radio-input"
                />
                <span className="radio-text">Translated Text</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TranslationConfigPanel;
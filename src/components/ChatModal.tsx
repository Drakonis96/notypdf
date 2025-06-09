import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import chatService, { ChatMessage } from '../services/chatService';
import apiKeyService from '../services/apiKeyService';
import { markdownService } from '../services/markdownService';
import { TranslationProvider, TranslationModel } from '../types';
import LoadingSpinner from './LoadingSpinner';
import './ChatModal.css';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  currentFile?: File | null;
}

const PROVIDER_OPTIONS: { label: string; value: TranslationProvider }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'DeepSeek', value: 'deepseek' },
];

const OPENAI_MODELS: { label: string; value: TranslationModel }[] = [
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4.1-mini', value: 'gpt-4.1-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
];
const OPENROUTER_MODELS: { label: string; value: TranslationModel }[] = [
  { label: 'Gemma 3 27B IT (free)', value: 'google/gemma-3-27b-it:free' },
  { label: 'Gemini 2.0 Flash Exp (free)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Llama 4 Maverick (free)', value: 'meta-llama/llama-4-maverick:free' },
  { label: 'Llama 4 Scout (free)', value: 'meta-llama/llama-4-scout:free' },
  { label: 'DeepSeek Chat v3 (free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Qwen 3 32B (free)', value: 'qwen/qwen3-32b:free' },
  { label: 'Mistral Small 3.1 (free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
];
const GEMINI_MODELS: { label: string; value: TranslationModel }[] = [
  { label: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
];
const DEEPSEEK_MODELS: { label: string; value: TranslationModel }[] = [
  { label: 'DeepSeek Chat', value: 'deepseek-chat' },
  { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
];

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, initialMessage, currentFile }) => {
  const [provider, setProvider] = useState<TranslationProvider>('openai');
  const [model, setModel] = useState<TranslationModel>('gpt-4o-mini');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [initialSent, setInitialSent] = useState(false);
  const [markdownContext, setMarkdownContext] = useState('');
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [limitTokens, setLimitTokens] = useState(false);
  const [tokenLimit, setTokenLimit] = useState('2048');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const loadContext = async () => {
      if (isOpen && currentFile && currentFile.name.toLowerCase().endsWith('.pdf')) {
        setIsContextLoading(true);
        try {
          const md = await markdownService.getMarkdown(currentFile.name);
          setMarkdownContext(md);
        } catch (err) {
          console.error('Error loading markdown context:', err);
          setMarkdownContext('');
        } finally {
          setIsContextLoading(false);
        }
      } else {
        setMarkdownContext('');
      }
    };
    loadContext();
  }, [isOpen, currentFile]);

  useEffect(() => {
    if (isOpen && initialMessage && !initialSent) {
      setInitialSent(true);
      setInputText(initialMessage);
      sendMessage(initialMessage);
    }
    if (!isOpen) {
      setInitialSent(false);
    }
  }, [isOpen, initialMessage]);

  const getModelOptions = () => {
    switch (provider) {
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

  const handleProviderChange = (prov: TranslationProvider) => {
    let defaultModel: TranslationModel = '';
    if (prov === 'openai') defaultModel = 'gpt-4o-mini';
    if (prov === 'openrouter') defaultModel = 'google/gemma-3-27b-it:free';
    if (prov === 'gemini') defaultModel = 'gemini-2.0-flash';
    if (prov === 'deepseek') defaultModel = 'deepseek-chat';
    setProvider(prov);
    setModel(defaultModel);
  };

  const sendMessage = async (textOverride?: string) => {
    const toSend = textOverride ?? inputText;
    if (!toSend.trim() || isContextLoading) return;
    try {
      const apiKey = await apiKeyService.getApiKey(provider);
      const userMessages = [...messages, { role: 'user', content: toSend.trim() }];
      setMessages(userMessages);
      setInputText('');
      setIsStreaming(true);
      setStreamingText('');
      const messagesToSend = messages.length === 0 && markdownContext
        ? [{ role: 'system', content: markdownContext }, ...userMessages]
        : userMessages;
      await chatService.streamChat(messagesToSend, {
        provider,
        model,
        apiKey,
        maxTokens: limitTokens ? parseInt(tokenLimit, 10) || undefined : undefined,
        onProgress: (txt) => setStreamingText(txt),
        onComplete: (full) => {
          setIsStreaming(false);
          setStreamingText('');
          setMessages([...userMessages, { role: 'assistant', content: full }]);
        },
        onError: () => {
          setIsStreaming(false);
          setStreamingText('');
        },
      });
    } catch (err) {
      console.error('Chat error:', err);
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setStreamingText('');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1}>
        <div className="chat-header">
          <h3>Chat</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="chat-config">
          <select
            className="config-select"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as TranslationProvider)}
          >
            {PROVIDER_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            className="config-select"
            value={model}
            onChange={(e) => setModel(e.target.value as TranslationModel)}
          >
            {getModelOptions().map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={limitTokens}
              onChange={e => setLimitTokens(e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-text">Limitar tokens</span>
          </label>
          {limitTokens && (
            <input
              type="number"
              className="token-input"
              value={tokenLimit}
              min="1"
              onChange={e => setTokenLimit(e.target.value)}
            />
          )}
        </div>
        <div className="chat-messages">
          {isContextLoading && (
            <div className="context-loading">
              <LoadingSpinner size={16} /> Cargando contexto...
            </div>
          )}
          {!isContextLoading && markdownContext && (
            <div className="context-loaded" aria-label="Markdown loaded">
              <span className="checkmark">&#10003;</span>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          ))}
          {isStreaming && (
            <div className="chat-bubble ai">
              <ReactMarkdown>{streamingText}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className="chat-input-section">
          <textarea
            className="config-textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={2}
          />
          <div className="chat-actions">
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={isStreaming || isContextLoading || !inputText.trim()}
            >
              Send
            </button>
            <button
              className="btn btn-tertiary"
              onClick={resetConversation}
              disabled={isStreaming}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal;


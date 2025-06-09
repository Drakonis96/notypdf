import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import chatService, { ChatMessage } from '../services/chatService';
import apiKeyService from '../services/apiKeyService';
import { TranslationProvider, TranslationModel } from '../types';
import './ChatModal.css';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
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

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, initialMessage }) => {
  const [provider, setProvider] = useState<TranslationProvider>('openai');
  const [model, setModel] = useState<TranslationModel>('gpt-4o-mini');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [initialSent, setInitialSent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

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
    if (!toSend.trim()) return;
    try {
      const apiKey = await apiKeyService.getApiKey(provider);
      const newMessages = [...messages, { role: 'user', content: toSend.trim() }];
      setMessages(newMessages);
      setInputText('');
      setIsStreaming(true);
      setStreamingText('');
      await chatService.streamChat(newMessages, {
        provider,
        model,
        apiKey,
        onProgress: (txt) => setStreamingText(txt),
        onComplete: (full) => {
          setIsStreaming(false);
          setStreamingText('');
          setMessages([...newMessages, { role: 'assistant', content: full }]);
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
          <select value={provider} onChange={(e) => handleProviderChange(e.target.value as TranslationProvider)}>
            {PROVIDER_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value as TranslationModel)}>
            {getModelOptions().map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="chat-messages">
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
          <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} rows={2} />
          <div className="chat-actions">
            <button onClick={sendMessage} disabled={isStreaming || !inputText.trim()}>Send</button>
            <button onClick={resetConversation} disabled={isStreaming}>Reset</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal;


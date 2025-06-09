import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import aiCompletionService, { AIProvider, AIModel } from '../services/aiCompletionService';
import apiKeyService from '../services/apiKeyService';
import './ChatModal.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
}

const OPENAI_MODELS: { label: string; value: AIModel }[] = [
  { label: 'gpt-4.1', value: 'gpt-4.1' },
  { label: 'gpt-4.1-mini', value: 'gpt-4.1-mini' },
  { label: 'gpt-4o', value: 'gpt-4o' },
  { label: 'gpt-4o-mini', value: 'gpt-4o-mini' },
];

const OPENROUTER_MODELS: { label: string; value: AIModel }[] = [
  { label: 'Gemma 3 27B IT (free)', value: 'google/gemma-3-27b-it:free' },
  { label: 'Gemini 2.0 Flash Exp (free)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Llama 4 Maverick (free)', value: 'meta-llama/llama-4-maverick:free' },
  { label: 'Llama 4 Scout (free)', value: 'meta-llama/llama-4-scout:free' },
  { label: 'DeepSeek Chat v3 (free)', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Qwen 3 32B (free)', value: 'qwen/qwen3-32b:free' },
  { label: 'Mistral Small 3.1 (free)', value: 'mistralai/mistral-small-3.1-24b-instruct:free' },
];

const GEMINI_MODELS: { label: string; value: AIModel }[] = [
  { label: 'Gemini 2.0 Pro', value: 'gemini-2.0-pro' },
  { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
];

const DEEPSEEK_MODELS: { label: string; value: AIModel }[] = [
  { label: 'DeepSeek Chat', value: 'deepseek-chat' },
  { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' },
];

function getModelOptions(provider: AIProvider) {
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
}

function getDefaultModel(provider: AIProvider): AIModel {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'openrouter':
      return 'google/gemma-3-27b-it:free';
    case 'gemini':
      return 'gemini-2.0-flash';
    case 'deepseek':
      return 'deepseek-chat';
    default:
      return '' as AIModel;
  }
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, selectedText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState<AIModel>('gpt-4o-mini');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedText) {
        setInput(`[${selectedText}] `);
      }
      textareaRef.current?.focus();
    }
  }, [isOpen, selectedText]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content) return;
    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    try {
      const apiKey = await apiKeyService.getApiKey(provider);
      const context = newMessages.slice(-3).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const reply = await aiCompletionService.completeText(context, { provider, model, apiKey });
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message || 'Failed to fetch'}` }]);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setInput('');
  };

  if (!isOpen) return null;

  const modelOptions = getModelOptions(provider);

  return createPortal(
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-modal-header">
          <h3>Chat</h3>
          <button className="close-button" onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        </div>
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-message ${m.role}`}>{m.content}</div>
          ))}
        </div>
        <div className="chat-controls">
          <div className="chat-selectors">
            <select value={provider} onChange={e => {
              const p = e.target.value as AIProvider;
              setProvider(p);
              setModel(getDefaultModel(p));
            }}>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
            </select>
            <select value={model} onChange={e => setModel(e.target.value as AIModel)}>
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
          />
          <div className="chat-actions">
            <button className="btn btn-tertiary" onClick={resetConversation} title="Reset conversation">
              <RotateCcw size={16} />
            </button>
            <button className="btn btn-primary" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal;

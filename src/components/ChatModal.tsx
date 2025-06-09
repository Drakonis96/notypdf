import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Send, RotateCcw } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import chatService, { ChatMessage, ChatContentPart } from '../services/chatService';
import apiKeyService from '../services/apiKeyService';
import { markdownService } from '../services/markdownService';
import { TranslationProvider, TranslationModel } from '../types';
import LoadingSpinner from './LoadingSpinner';
import './ChatModal.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`;

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  currentFile?: File | null;
  currentPage?: number;
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

type ContextMode = 'markdown' | 'full-pdf' | 'selected-page';

const PROVIDERS_WITH_FILE_SUPPORT: TranslationProvider[] = ['openai', 'openrouter', 'gemini'];

const renderMessageContent = (content: string | ChatContentPart[]): string => {
  if (typeof content === 'string') {
    return content;
  }
  // For ChatContentPart[], extract text content and describe files
  return content.map(part => {
    if (part.type === 'text') {
      return part.text;
    } else if (part.type === 'file') {
      return `[FILE: ${part.file.filename}]`;
    }
    return '';
  }).join('\n');
};

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, initialMessage, currentFile, currentPage: currentPageProp }) => {
  const [provider, setProvider] = useState<TranslationProvider>('openai');
  const [model, setModel] = useState<TranslationModel>('gpt-4o-mini');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [markdownContext, setMarkdownContext] = useState('');
  const [fileData, setFileData] = useState('');
  const [contextMode, setContextMode] = useState<ContextMode>('markdown');
  const [currentPage, setCurrentPage] = useState(1);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [limitTokens, setLimitTokens] = useState(false);
  const [tokenLimit, setTokenLimit] = useState('2048');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPageProp) setCurrentPage(currentPageProp);
  }, [currentPageProp]);

  useEffect(() => {
    if (isOpen && modalRef.current) modalRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const b64 = result.split(',')[1];
            resolve(b64 || '');
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    };

    const getPageText = async (file: File, page: number): Promise<string> => {
      const pdf = await pdfjs.getDocument(URL.createObjectURL(file)).promise;
      const pg = await pdf.getPage(page);
      const tc = await pg.getTextContent();
      return tc.items.map((i: any) => i.str).join(' ').trim();
    };

    const loadContext = async () => {
      if (isOpen && currentFile && currentFile.name.toLowerCase().endsWith('.pdf')) {
        setIsContextLoading(true);
        try {
          if (contextMode === 'markdown') {
            const md = await markdownService.getMarkdown(currentFile.name);
            setMarkdownContext(md);
            setFileData('');
          } else if (contextMode === 'full-pdf') {
            const b64 = await fileToBase64(currentFile);
            setFileData(b64);
            setMarkdownContext('');
          } else if (contextMode === 'selected-page') {
            const txt = await getPageText(currentFile, currentPage);
            setMarkdownContext(txt);
            setFileData('');
          }
        } catch (err) {
          console.error('Error loading context:', err);
          setMarkdownContext('');
          setFileData('');
        } finally {
          setIsContextLoading(false);
        }
      } else {
        setMarkdownContext('');
        setFileData('');
      }
    };
    loadContext();
  }, [isOpen, currentFile, contextMode, currentPage, provider]);

  useEffect(() => {
    if (isOpen && initialMessage) {
      setInputText(initialMessage);
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
    if (contextMode === 'full-pdf' && !PROVIDERS_WITH_FILE_SUPPORT.includes(prov)) {
      setContextMode('markdown');
    }
    resetConversation();
  };

  const handleModelChange = (mod: TranslationModel) => {
    setModel(mod);
    resetConversation();
  };

  const sendMessage = async (textOverride?: string) => {
    const toSend = textOverride ?? inputText;
    if (!toSend.trim() || isContextLoading) return;
    try {
      const apiKey = await apiKeyService.getApiKey(provider);
      const userMessage: ChatMessage = { role: 'user', content: toSend.trim() };
      const userMessages = [...messages, userMessage];
      setMessages(userMessages);
      setInputText('');
      setIsStreaming(true);
      setStreamingText('');
      let messagesToSend: ChatMessage[];
      if (messages.length === 0) {
        if (contextMode === 'markdown' && markdownContext) {
          const combined = `[DOCUMENTO]\n${markdownContext}\n[/DOCUMENTO]\n\n${toSend.trim()}`;
          messagesToSend = [...messages, { role: 'user', content: combined }];
        } else if (contextMode === 'selected-page' && markdownContext) {
          const combined = `[PAGE ${currentPage}]\n${markdownContext}\n[/PAGE]\n\n${toSend.trim()}`;
          messagesToSend = [...messages, { role: 'user', content: combined }];
        } else if (contextMode === 'full-pdf' && fileData) {
          if (provider === 'openai' || provider === 'openrouter') {
            const dataUrl = `data:application/pdf;base64,${fileData}`;
            const content: ChatContentPart[] = [
              { type: 'text', text: toSend.trim() },
              { type: 'file', file: { filename: currentFile?.name || 'document.pdf', file_data: dataUrl } },
            ];
            messagesToSend = [...messages, { role: 'user', content }];
          } else {
            const combined = `[FILE:${currentFile?.name};base64]\n${fileData}\n[/FILE]\n\n${toSend.trim()}`;
            messagesToSend = [...messages, { role: 'user', content: combined }];
          }
        } else {
          messagesToSend = [...messages, userMessage];
        }
      } else {
        messagesToSend = [...messages, userMessage];
      }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      onClose();
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
            onChange={(e) => handleModelChange(e.target.value as TranslationModel)}
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
          {!isContextLoading && (markdownContext || fileData) && (
            <div className="context-loaded" aria-label="Context loaded">
              <span className="checkmark">&#10003;</span>
              <select
                className="context-mode-select"
                value={contextMode}
                onChange={e => setContextMode(e.target.value as ContextMode)}
              >
                <option value="markdown">Markdown (short files)</option>
                <option value="full-pdf" disabled={!PROVIDERS_WITH_FILE_SUPPORT.includes(provider)}>
                  Full PDF (large files)
                </option>
                <option value="selected-page">Selected page</option>
              </select>
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
              <ReactMarkdown>{renderMessageContent(m.content)}</ReactMarkdown>
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
            onKeyDown={handleKeyDown}
          />
          <div className="chat-actions">
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={isStreaming || isContextLoading || !inputText.trim()}
              aria-label="Send"
              title="Send"
            >
              <Send size={16} />
            </button>
            <button
              className="btn btn-tertiary"
              onClick={resetConversation}
              disabled={isStreaming}
              aria-label="Reset conversation"
              title="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChatModal;


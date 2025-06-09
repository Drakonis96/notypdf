import apiKeyService from './apiKeyService';
import { TranslationProvider, TranslationModel } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingChatOptions {
  provider: TranslationProvider;
  model: TranslationModel;
  apiKey: string;
  maxTokens?: number;
  systemFingerprint?: string;
  onProgress?: (partial: string) => void;
  onComplete?: (full: string) => void;
  onError?: (err: Error) => void;
}

async function chatWithOpenAIStreaming(messages: ChatMessage[], options: StreamingChatOptions): Promise<void> {
  const { model, apiKey, maxTokens, onProgress, onComplete, onError, systemFingerprint } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  const body: Record<string, any> = {
    model,
    messages,
    max_tokens: maxTokens ?? 2048,
    temperature: 0.2,
    stream: true,
  };
  if (systemFingerprint) body.system_fingerprint = systemFingerprint;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              full += content;
              onProgress?.(full);
            }
          }
        } catch (e) {
          console.warn('Failed to parse streaming response:', e);
        }
      }
    }
    onComplete?.(full);
  } catch (err) {
    onError?.(err as Error);
  }
}

async function chatWithOpenRouterStreaming(messages: ChatMessage[], options: StreamingChatOptions): Promise<void> {
  const { model, apiKey, maxTokens, onProgress, onComplete, onError, systemFingerprint } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body: Record<string, any> = {
    model,
    messages,
    max_tokens: maxTokens ?? 2048,
    temperature: 0.2,
    stream: true,
  };
  if (systemFingerprint) body.system_fingerprint = systemFingerprint;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              full += content;
              onProgress?.(full);
            }
          }
        } catch (e) {
          console.warn('Failed to parse streaming response:', e);
        }
      }
    }
    onComplete?.(full);
  } catch (err) {
    onError?.(err as Error);
  }
}

async function chatWithGeminiStreaming(messages: ChatMessage[], options: StreamingChatOptions): Promise<void> {
  const { model, apiKey, maxTokens, onProgress, onComplete, onError } = options;
  // Gemini's API docs don't mention a system fingerprint parameter,
  // so caching the context this way is currently unsupported.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.content }] }));
  const body = {
    contents,
    generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens ?? 2048 },
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text) {
            const content = parsed.candidates[0].content.parts[0].text;
            if (content) {
              full += content;
              onProgress?.(full);
            }
          }
        } catch (e) {
          console.warn('Failed to parse Gemini streaming response:', e);
        }
      }
    }
    onComplete?.(full);
  } catch (err) {
    onError?.(err as Error);
  }
}

async function chatWithDeepSeekStreaming(messages: ChatMessage[], options: StreamingChatOptions): Promise<void> {
  const { model, apiKey: apiKeyFromOptions, maxTokens, onProgress, onComplete, onError } = options;
  const apiKey = apiKeyFromOptions || await apiKeyService.getApiKey('deepseek');
  const url = 'https://api.deepseek.com/v1/chat/completions';
  const body = {
    model,
    messages,
    max_tokens: maxTokens ?? 2048,
    temperature: 0.2,
    stream: true,
  };
  // DeepSeek's API documentation doesn't list a "system_fingerprint" parameter.
  // Caching the markdown context in this way is therefore not available.
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              full += content;
              onProgress?.(full);
            }
          }
        } catch (e) {
          console.warn('Failed to parse streaming response:', e);
        }
      }
    }
    onComplete?.(full);
  } catch (err) {
    onError?.(err as Error);
  }
}

export async function streamChat(messages: ChatMessage[], options: StreamingChatOptions): Promise<void> {
  switch (options.provider) {
    case 'openai':
      return chatWithOpenAIStreaming(messages, options);
    case 'openrouter':
      return chatWithOpenRouterStreaming(messages, options);
    case 'gemini':
      return chatWithGeminiStreaming(messages, options);
    case 'deepseek':
      return chatWithDeepSeekStreaming(messages, options);
    default:
      throw new Error('Unsupported provider');
  }
}

const chatService = { streamChat };
export default chatService;

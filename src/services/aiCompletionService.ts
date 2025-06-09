import axios from 'axios';
import apiKeyService from './apiKeyService';

export type AIProvider = 'openai' | 'openrouter' | 'gemini' | 'deepseek' | '';

export type OpenAIModel = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini';
export type OpenRouterModel =
  | 'google/gemma-3-27b-it:free'
  | 'google/gemini-2.0-flash-exp:free'
  | 'meta-llama/llama-4-maverick:free'
  | 'meta-llama/llama-4-scout:free'
  | 'deepseek/deepseek-chat-v3-0324:free'
  | 'qwen/qwen3-32b:free'
  | 'microsoft/wizardlm-2-8x22b:free'
  | 'liquid/lfm-40b:free'
  | 'mistralai/mistral-small-3.1-24b-instruct:free';
export type GeminiModel = 'gemini-2.0-pro' | 'gemini-2.0-flash';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

export type AIModel = OpenAIModel | OpenRouterModel | GeminiModel | DeepSeekModel | '';

export interface AICompletionOptions {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingAICompletionOptions extends AICompletionOptions {
  onProgress?: (partialText: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export async function completeText(
  prompt: string,
  options: AICompletionOptions
): Promise<string> {
  switch (options.provider) {
    case 'openai':
      return completeWithOpenAI(prompt, options);
    case 'openrouter':
      return completeWithOpenRouter(prompt, options);
    case 'gemini':
      return completeWithGemini(prompt, options);
    case 'deepseek':
      return completeWithDeepSeek(prompt, options);
    default:
      throw new Error('Unsupported provider');
  }
}

export async function completeTextStreaming(
  prompt: string,
  options: StreamingAICompletionOptions,
): Promise<void> {
  switch (options.provider) {
    case 'openai':
      return completeWithOpenAIStreaming(prompt, options);
    case 'openrouter':
      return completeWithOpenRouterStreaming(prompt, options);
    case 'gemini':
      return completeWithGeminiStreaming(prompt, options);
    case 'deepseek':
      return completeWithDeepSeekStreaming(prompt, options);
    default:
      try {
        const result = await completeText(prompt, options);
        options.onProgress?.(result);
        options.onComplete?.(result);
      } catch (error) {
        options.onError?.(error as Error);
      }
  }
}

async function completeWithOpenAI(
  prompt: string,
  options: AICompletionOptions
): Promise<string> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024 } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const body = {
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  
  if (
    result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content
  ) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('No completion result from OpenAI');
}

async function completeWithOpenRouter(
  prompt: string,
  options: AICompletionOptions
): Promise<string> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024 } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const body = {
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  
  if (
    result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content
  ) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('No completion result from OpenRouter');
}

async function completeWithGemini(
  prompt: string,
  options: AICompletionOptions
): Promise<string> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024 } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  
  if (
    result.candidates &&
    result.candidates[0] &&
    result.candidates[0].content &&
    result.candidates[0].content.parts &&
    result.candidates[0].content.parts[0] &&
    result.candidates[0].content.parts[0].text
  ) {
    return result.candidates[0].content.parts[0].text.trim();
  }
  
  throw new Error('No completion result from Gemini');
}

async function completeWithDeepSeek(
  prompt: string,
  options: AICompletionOptions
): Promise<string> {
  const { model, apiKey: apiKeyFromOptions, temperature = 0.7, maxTokens = 1024 } = options;
  
  // Get API key from backend if not provided
  const apiKey = apiKeyFromOptions || await apiKeyService.getApiKey('deepseek');
  
  const baseUrl = 'https://api.deepseek.com/v1';
  const url = `${baseUrl}/chat/completions`;
  
  const body = {
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  
  if (
    result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content
  ) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('No completion result from DeepSeek');
}

async function completeWithOpenAIStreaming(
  prompt: string,
  options: StreamingAICompletionOptions,
): Promise<void> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024, onProgress, onComplete, onError } = options;
  const url = 'https://api.openai.com/v1/chat/completions';

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;

        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullText += content;
              onProgress?.(fullText);
            }
          }
        } catch (err) {
          console.warn('Failed to parse streaming response:', err);
        }
      }
    }

    onComplete?.(fullText);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function completeWithOpenRouterStreaming(
  prompt: string,
  options: StreamingAICompletionOptions,
): Promise<void> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024, onProgress, onComplete, onError } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;

        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullText += content;
              onProgress?.(fullText);
            }
          }
        } catch (err) {
          console.warn('Failed to parse streaming response:', err);
        }
      }
    }

    onComplete?.(fullText);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function completeWithGeminiStreaming(
  prompt: string,
  options: StreamingAICompletionOptions,
): Promise<void> {
  const { model, apiKey, temperature = 0.7, maxTokens = 1024, onProgress, onComplete, onError } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
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
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;

        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (
            parsed.candidates &&
            parsed.candidates[0] &&
            parsed.candidates[0].content &&
            parsed.candidates[0].content.parts &&
            parsed.candidates[0].content.parts[0] &&
            parsed.candidates[0].content.parts[0].text
          ) {
            const content = parsed.candidates[0].content.parts[0].text;
            if (content) {
              fullText += content;
              onProgress?.(fullText);
            }
          }
        } catch (err) {
          console.warn('Failed to parse Gemini streaming response:', err);
        }
      }
    }

    onComplete?.(fullText);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function completeWithDeepSeekStreaming(
  prompt: string,
  options: StreamingAICompletionOptions,
): Promise<void> {
  const { model, apiKey: apiKeyFromOptions, temperature = 0.7, maxTokens = 1024, onProgress, onComplete, onError } = options;
  const apiKey = apiKeyFromOptions || await apiKeyService.getApiKey('deepseek');
  const baseUrl = 'https://api.deepseek.com/v1';
  const url = `${baseUrl}/chat/completions`;

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;

        try {
          const jsonData = trimmed.slice(6);
          const parsed = JSON.parse(jsonData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullText += content;
              onProgress?.(fullText);
            }
          }
        } catch (err) {
          console.warn('Failed to parse streaming response:', err);
        }
      }
    }

    onComplete?.(fullText);
  } catch (error) {
    onError?.(error as Error);
  }
}

const aiCompletionService = {
  completeText,
  completeTextStreaming,
};

export default aiCompletionService;

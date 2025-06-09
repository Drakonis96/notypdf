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

const aiCompletionService = {
  completeText,
};

export default aiCompletionService;

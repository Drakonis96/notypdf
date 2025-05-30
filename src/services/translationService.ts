import axios from 'axios';

// Translation service - placeholder for future implementation
export type TranslationProvider = 'openai' | 'openrouter' | 'gemini' | 'deepseek' | '';

export type OpenAIModel = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini';
export type OpenRouterModel =
  | 'google/gemma-3-27b-it:free'
  | 'google/gemini-2.0-flash-exp:free'
  | 'meta-llama/llama-4-maverick:free'
  | 'meta-llama/llama-4-scout:free';
export type GeminiModel = 'gemini-2.0-pro' | 'gemini-2.0-flash';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

export type TranslationModel = OpenAIModel | OpenRouterModel | GeminiModel | DeepSeekModel | '';

export interface TranslationOptions {
  provider: TranslationProvider;
  model: TranslationModel;
  apiKey: string;
  targetLanguage: string;
}

export async function translateText(
  text: string,
  options: TranslationOptions
): Promise<string> {
  switch (options.provider) {
    case 'openai':
      return translateWithOpenAI(text, options);
    case 'openrouter':
      return translateWithOpenRouter(text, options);
    case 'gemini':
      return translateWithGemini(text, options);
    case 'deepseek':
      return translateWithDeepSeek(text, options);
    default:
      throw new Error('Unsupported provider');
  }
}

async function translateWithOpenAI(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  const prompt = `Translate the following text to ${targetLanguage} and return only the translation.\n\n${text}`;
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
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
  throw new Error('No translation result from OpenAI');
}

async function translateWithOpenRouter(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const prompt = `Translate the following text to ${targetLanguage} and return only the translation.\n\n${text}`;
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
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
  throw new Error('No translation result from OpenRouter');
}

async function translateWithGemini(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `Translate the following text to ${targetLanguage} and return only the translation.\n\n${text}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
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
  throw new Error('No translation result from Gemini');
}

async function translateWithDeepSeek(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey: apiKeyFromOptions, targetLanguage } = options;
  // Permitir override por variable de entorno
  const apiKey = apiKeyFromOptions || process.env.DEEPSEEK_API_KEY || (typeof window !== 'undefined' ? window._env_?.DEEPSEEK_API_KEY : '');
  // Hardcode DeepSeek API base URL
  const baseUrl = 'https://api.deepseek.com/v1';
  const url = `${baseUrl}/chat/completions`;
  const prompt = `Translate the following text to ${targetLanguage} and return only the translation.\n\n${text}`;
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
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
  throw new Error('No translation result from DeepSeek');
}

const translationService = {
  translateText,
};

export default translationService;
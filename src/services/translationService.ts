import axios from 'axios';
import apiKeyService from './apiKeyService';

export const DEFAULT_TRANSLATION_PROMPT =
  'Translate the following text to {{target_language}}. Format the translation as markdown, preserving paragraph breaks, titles, and other formatting. Return only the translated text formatted as markdown.\n\n{{text}}';

// Helper function to ensure proper text formatting with line breaks
function ensureProperLineBreaks(text: string): string {
  // Remove any extra spaces and normalize line breaks
  let processedText = text.trim();
  
  // If the text appears to be on a single line but should have paragraphs
  // (indicated by sentence endings followed by capital letters)
  if (!processedText.includes('\n\n') && processedText.includes('. ')) {
    // Split on sentence endings followed by capital letters
    processedText = processedText.replace(/\. ([A-Z])/g, '.\n\n$1');
  }
  
  // Ensure double line breaks between paragraphs
  processedText = processedText.replace(/\n\n+/g, '\n\n');
  
  // Add line breaks after common markdown patterns if they're missing
  processedText = processedText.replace(/^(#+ .+)$/gm, '$1\n');
  processedText = processedText.replace(/^(\* .+)$/gm, '$1\n');
  processedText = processedText.replace(/^(\d+\. .+)$/gm, '$1\n');
  
  return processedText;
}

function buildPrompt(template: string, text: string, targetLanguage: string): string {
  return template
    .replace(/{{text}}/g, text)
    .replace(/{{target_language}}/g, targetLanguage);
}

// Translation service - placeholder for future implementation
export type TranslationProvider = 'openai' | 'openrouter' | 'gemini' | 'deepseek' | '';

export type OpenAIModel = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini';
export type OpenRouterModel =
  | 'google/gemma-3-27b-it:free'
  | 'google/gemini-2.0-flash-exp:free'
  | 'meta-llama/llama-4-maverick:free'
  | 'meta-llama/llama-4-scout:free'
  | 'deepseek/deepseek-chat-v3-0324:free'
  | 'qwen/qwen3-32b:free'
  | 'mistralai/mistral-small-3.1-24b-instruct:free';
export type GeminiModel = 'gemini-2.0-pro' | 'gemini-2.0-flash';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

export type TranslationModel = OpenAIModel | OpenRouterModel | GeminiModel | DeepSeekModel | '';

export interface TranslationOptions {
  provider: TranslationProvider;
  model: TranslationModel;
  apiKey: string;
  targetLanguage: string;
  promptTemplate?: string;
}

export interface StreamingTranslationOptions extends TranslationOptions {
  onProgress?: (partialText: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface OcrOptions {
  provider: TranslationProvider;
  model: TranslationModel;
  apiKey: string;
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

export async function translateTextStreaming(
  text: string,
  options: StreamingTranslationOptions
): Promise<void> {
  switch (options.provider) {
    case 'openai':
      return translateWithOpenAIStreaming(text, options);
    case 'openrouter':
      return translateWithOpenRouterStreaming(text, options);
    case 'gemini':
      return translateWithGeminiStreaming(text, options);
    case 'deepseek':
      return translateWithDeepSeekStreaming(text, options);
    default:
      // Fallback to regular translation for non-streaming providers
      try {
        const result = await translateText(text, options);
        options.onProgress?.(result);
        options.onComplete?.(result);
      } catch (error) {
        options.onError?.(error as Error);
      }
  }
}

async function translateWithOpenAI(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles.' },
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

async function translateWithOpenAIStreaming(
  text: string,
  options: StreamingTranslationOptions
): Promise<void> {
  const { model, apiKey, targetLanguage, onProgress, onComplete, onError, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    stream: true,
  };

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
    let fullTranslation = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonData = trimmedLine.slice(6); // Remove 'data: ' prefix
          const parsed = JSON.parse(jsonData);
          
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullTranslation += content;
              onProgress?.(fullTranslation);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse streaming response:', parseError);
        }
      }
    }

    onComplete?.(fullTranslation);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function translateWithOpenRouter(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles.' },
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

async function translateWithOpenRouterStreaming(
  text: string,
  options: StreamingTranslationOptions
): Promise<void> {
  const { model, apiKey, targetLanguage, onProgress, onComplete, onError, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    stream: true,
  };

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
    let fullTranslation = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonData = trimmedLine.slice(6); // Remove 'data: ' prefix
          const parsed = JSON.parse(jsonData);
          
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullTranslation += content;
              onProgress?.(fullTranslation);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse streaming response:', parseError);
        }
      }
    }

    onComplete?.(fullTranslation);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function translateWithGemini(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey, targetLanguage, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
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
    systemInstruction: {
      parts: [{ text: 'You are a translation assistant. CRITICAL: Always format your translations with proper line breaks and paragraph structure. Each paragraph must be separated by double line breaks (\\n\\n). Do NOT return everything on a single line. Preserve the original text structure and ensure readability with proper formatting.' }]
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
    const translatedText = result.candidates[0].content.parts[0].text.trim();
    return ensureProperLineBreaks(translatedText);
  }
  throw new Error('No translation result from Gemini');
}

async function translateWithGeminiStreaming(
  text: string,
  options: StreamingTranslationOptions
): Promise<void> {
  const { model, apiKey, targetLanguage, onProgress, onComplete, onError, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  
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
    systemInstruction: {
      parts: [{ text: 'You are a translation assistant. CRITICAL: Always format your translations with proper line breaks and paragraph structure. Each paragraph must be separated by double line breaks (\\n\\n). Do NOT return everything on a single line. Preserve the original text structure and ensure readability with proper formatting.' }]
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
    let fullTranslation = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonData = trimmedLine.slice(6); // Remove 'data: ' prefix
          const parsed = JSON.parse(jsonData);
          
          // Gemini response structure: candidates[0].content.parts[0].text
          if (parsed.candidates && 
              parsed.candidates[0] && 
              parsed.candidates[0].content && 
              parsed.candidates[0].content.parts && 
              parsed.candidates[0].content.parts[0] && 
              parsed.candidates[0].content.parts[0].text) {
            const content = parsed.candidates[0].content.parts[0].text;
            if (content) {
              fullTranslation += content;
              onProgress?.(fullTranslation);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse Gemini streaming response:', parseError);
        }
      }
    }

    const processedTranslation = ensureProperLineBreaks(fullTranslation);
    onComplete?.(processedTranslation);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function translateWithDeepSeek(
  text: string,
  options: TranslationOptions
): Promise<string> {
  const { model, apiKey: apiKeyFromOptions, targetLanguage, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  // Get API key from backend if not provided
  const apiKey = apiKeyFromOptions || await apiKeyService.getApiKey('deepseek');
  // Hardcode DeepSeek API base URL
  const baseUrl = 'https://api.deepseek.com/v1';
  const url = `${baseUrl}/chat/completions`;
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant. Always format your translations as markdown to preserve structure, paragraph breaks, and titles.' },
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

async function translateWithDeepSeekStreaming(
  text: string,
  options: StreamingTranslationOptions
): Promise<void> {
  const { model, apiKey: apiKeyFromOptions, targetLanguage, onProgress, onComplete, onError, promptTemplate = DEFAULT_TRANSLATION_PROMPT } = options;
  // Get API key from backend if not provided
  const apiKey = apiKeyFromOptions || await apiKeyService.getApiKey('deepseek');
  // Hardcode DeepSeek API base URL
  const baseUrl = 'https://api.deepseek.com/v1';
  const url = `${baseUrl}/chat/completions`;
  const prompt = buildPrompt(promptTemplate, text, targetLanguage);
  
  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a translation assistant.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    stream: true,
  };

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
    let fullTranslation = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') continue;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonData = trimmedLine.slice(6); // Remove 'data: ' prefix
          const parsed = JSON.parse(jsonData);
          
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const content = parsed.choices[0].delta.content;
            if (content) {
              fullTranslation += content;
              onProgress?.(fullTranslation);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse streaming response:', parseError);
        }
      }
    }

    onComplete?.(fullTranslation);
  } catch (error) {
    onError?.(error as Error);
  }
}

async function ocrImage(
  dataUrl: string,
  options: OcrOptions
): Promise<string> {
  switch (options.provider) {
    case 'openai':
      return ocrWithOpenAIVision(dataUrl, options);
    case 'openrouter':
      return ocrWithOpenRouterVision(dataUrl, options);
    case 'gemini':
      return ocrWithGemini(dataUrl, options);
    default:
      throw new Error('OCR not supported for this provider');
  }
}

async function ocrWithOpenAIVision(
  dataUrl: string,
  options: OcrOptions
): Promise<string> {
  const { model, apiKey } = options;
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          {
            type: 'text',
            text:
              'Extract the text in this image exactly. Preserve original paragraphs and line breaks.',
          },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0,
  };
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  if (result.choices && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }
  throw new Error('No OCR result from OpenAI');
}

async function ocrWithOpenRouterVision(
  dataUrl: string,
  options: OcrOptions
): Promise<string> {
  const { model, apiKey } = options;
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          {
            type: 'text',
            text:
              'Extract the text in this image exactly. Preserve original paragraphs and line breaks.',
          },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0,
  };
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  if (result.choices && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }
  throw new Error('No OCR result from OpenRouter');
}

async function ocrWithGemini(
  dataUrl: string,
  options: OcrOptions
): Promise<string> {
  const { model, apiKey } = options;
  const base64 = dataUrl.split(',')[1];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          {
            text:
              'Extract the text in this image exactly. Preserve original paragraphs and line breaks.',
          },
        ],
      },
    ],
  };
  const headers = {
    'Content-Type': 'application/json',
  };
  const response = await axios.post(url, body, { headers });
  const result = response.data;
  if (
    result.candidates &&
    result.candidates[0]?.content?.parts &&
    result.candidates[0].content.parts[0]?.text
  ) {
    return result.candidates[0].content.parts[0].text.trim();
  }
  throw new Error('No OCR result from Gemini');
}

const translationService = {
  translateText,
  translateTextStreaming,
  ocrImage,
};

export default translationService;

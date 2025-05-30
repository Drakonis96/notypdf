export interface NotionConfig {
  databaseId: string;
  identifierColumn: string;
  textColumn: string;
  annotationColumn: string;
  pageColumn: string;
  identifierPattern: string;
  annotation: string;
  pageNumber: string;
  documentIdInsertionColumn: string; // New: column for document identifier insertion
  enableDocumentIdInsertion?: boolean; // New: flag to enable document ID insertion
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export type OpenAIModel = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4o' | 'gpt-4o-mini';
export type OpenRouterModel =
  | 'google/gemma-3-27b-it:free'
  | 'google/gemini-2.0-flash-exp:free'
  | 'meta-llama/llama-4-maverick:free'
  | 'meta-llama/llama-4-scout:free';
export type GeminiModel = 'gemini-2.0-pro' | 'gemini-2.0-flash';
export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';
export type TranslationProvider = 'openai' | 'openrouter' | 'gemini' | 'deepseek' | '';
export type TranslationModel = OpenAIModel | OpenRouterModel | GeminiModel | DeepSeekModel | '';

export interface TranslationConfig {
  enabled: boolean;
  provider: TranslationProvider;
  model: TranslationModel;
  targetLanguage: string;
  sendMode: 'original' | 'translated';
}

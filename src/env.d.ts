declare global {
  interface Window {
    _env_?: {
      NOTION_API_KEY?: string;
      OPENAI_API_KEY?: string;
      OPENROUTER_API_KEY?: string;
      GEMINI_API_KEY?: string;
      DEEPSEEK_API_KEY?: string;
      API_BASE_URL?: string;
    };
  }
}

export {};

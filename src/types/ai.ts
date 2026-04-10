/** AI 服务提供商类型 */
export type AIProvider = 'openai-compatible' | 'gemini' | 'ollama';

/** OpenAI 兼容 / DeepSeek 等提供商配置 */
export interface OpenAICompatibleAISettings {
  endpoint: string;
  apiKey: string;
  model: string;
}

/** Gemini 配置 */
export interface GeminiAISettings {
  apiKey: string;
  model: string;
}

/** Ollama 配置 */
export interface OllamaAISettings {
  endpoint: string;
  model: string;
}

/** AI 全局设置 */
export interface AISettings {
  provider: AIProvider;
  openaiCompatible: OpenAICompatibleAISettings;
  gemini: GeminiAISettings;
  ollama: OllamaAISettings;
}

/** 世界书 AI 排序建议 */
export interface WorldbookSortSuggestion {
  index: number;
  suggestedPosition?: number;
  suggestedDepth?: number;
  suggestedRole?: 0 | 1 | 2;
  suggestedOrder?: number;
  suggestedProb?: number;
  suggestedPriority?: number;
  suggestedStrategy?: 'selective' | 'constant' | 'vectorized';
  reason: string;
}

import type {
  AIProvider,
  AISettings,
} from '../types/ai';

// ============================================================
//  AI 设置与调用
// ============================================================

const STORAGE_KEY = 'st_ai_settings_v1';

export interface AITextCallOptions {
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openai-compatible',
  openaiCompatible: {
    endpoint: '',
    apiKey: '',
    model: 'deepseek-chat',
  },
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash',
  },
  ollama: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.1',
  },
};

function cloneSettings(settings: AISettings): AISettings {
  return JSON.parse(JSON.stringify(settings)) as AISettings;
}

function normalizeEndpoint(value: string, fallback: string): string {
  let endpoint = String(value || '').trim();
  if (!endpoint) endpoint = fallback;
  if (!endpoint) return '';

  if (!/^https?:\/\//i.test(endpoint)) {
    endpoint = endpoint.startsWith('localhost') || endpoint.startsWith('127.0.0.1')
      ? 'http://' + endpoint
      : 'https://' + endpoint;
  }

  return endpoint.replace(/\/+$/, '');
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = Array.isArray(base) ? [] : { ...base };
  const overrideObject = override || {};

  Object.keys(overrideObject).forEach(function(key) {
    const baseValue = (base as Record<string, unknown>)[key];
    const overrideValue = overrideObject[key as keyof T];

    if (
      overrideValue &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(baseValue as Record<string, unknown>, overrideValue as Record<string, unknown>);
      return;
    }

    if (overrideValue !== undefined) {
      result[key] = overrideValue as unknown;
    }
  });

  return result as T;
}

function sanitizeSettings(raw: unknown): AISettings {
  const merged = deepMerge(
    DEFAULT_AI_SETTINGS,
    raw && typeof raw === 'object' ? (raw as Partial<AISettings>) : {}
  );

  const provider: AIProvider = merged.provider === 'gemini' || merged.provider === 'ollama' || merged.provider === 'openai-compatible'
    ? merged.provider
    : DEFAULT_AI_SETTINGS.provider;

  return {
    provider,
    openaiCompatible: {
      endpoint: normalizeEndpoint(merged.openaiCompatible?.endpoint || '', DEFAULT_AI_SETTINGS.openaiCompatible.endpoint),
      apiKey: String(merged.openaiCompatible?.apiKey || '').trim(),
      model: String(merged.openaiCompatible?.model || '').trim() || DEFAULT_AI_SETTINGS.openaiCompatible.model,
    },
    gemini: {
      apiKey: String(merged.gemini?.apiKey || '').trim(),
      model: String(merged.gemini?.model || '').trim() || DEFAULT_AI_SETTINGS.gemini.model,
    },
    ollama: {
      endpoint: normalizeEndpoint(merged.ollama?.endpoint || '', DEFAULT_AI_SETTINGS.ollama.endpoint),
      model: String(merged.ollama?.model || '').trim() || DEFAULT_AI_SETTINGS.ollama.model,
    },
  };
}

/** 从 localStorage 读取 AI 设置 */
export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSettings(DEFAULT_AI_SETTINGS);
    return sanitizeSettings(JSON.parse(raw));
  } catch (error) {
    return cloneSettings(DEFAULT_AI_SETTINGS);
  }
}

/** 保存 AI 设置到 localStorage */
export function saveAISettings(settings: AISettings): AISettings {
  const normalized = sanitizeSettings(settings);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {}
  return normalized;
}

/** 重置 AI 设置 */
export function resetAISettings(): AISettings {
  return cloneSettings(DEFAULT_AI_SETTINGS);
}

/** 提供商显示名称 */
export function getAIProviderLabel(provider: AIProvider): string {
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'ollama') return 'Ollama';
  return 'OpenAI 兼容 / DeepSeek';
}

/** 生成设置摘要 */
export function buildAISettingsSummary(settings: AISettings | null | undefined): string {
  const normalized = settings ? sanitizeSettings(settings) : cloneSettings(DEFAULT_AI_SETTINGS);
  const issue = validateAISettings(normalized);
  if (issue) return '未就绪：' + issue;

  if (normalized.provider === 'gemini') {
    return '已配置：' + getAIProviderLabel(normalized.provider) + ' · ' + normalized.gemini.model;
  }
  if (normalized.provider === 'ollama') {
    return '已配置：' + getAIProviderLabel(normalized.provider) + ' · ' + normalized.ollama.model;
  }
  return '已配置：' + getAIProviderLabel(normalized.provider) + ' · ' + normalized.openaiCompatible.model;
}

/** 校验 AI 设置，返回错误提示或 null */
export function validateAISettings(settings: AISettings | null | undefined): string | null {
  if (!settings) return '请先保存 AI 设置';

  const normalized = sanitizeSettings(settings);

  if (normalized.provider === 'gemini') {
    if (!normalized.gemini.apiKey) return '请填写 Gemini API Key';
    if (!normalized.gemini.model) return '请填写 Gemini 模型名称';
    return null;
  }

  if (normalized.provider === 'ollama') {
    if (!normalized.ollama.endpoint) return '请填写 Ollama 地址';
    if (!normalized.ollama.model) return '请填写 Ollama 模型名称';
    return null;
  }

  if (!normalized.openaiCompatible.endpoint) return '请填写 OpenAI 兼容 API Base URL';
  if (!normalized.openaiCompatible.model) return '请填写模型名称';
  return null;
}

function normalizeOpenAIChatEndpoint(endpoint: string): string {
  const clean = normalizeEndpoint(endpoint, '');
  if (!clean) return '';
  if (/\/chat\/completions\/?$/i.test(clean)) return clean.replace(/\/+$/, '');
  if (/\/v1\/?$/i.test(clean)) return clean.replace(/\/+$/, '') + '/chat/completions';
  return clean + '/v1/chat/completions';
}

function extractOpenAIContent(data: unknown): string {
  const payload = data as Record<string, unknown> | null;
  const choices = payload && Array.isArray(payload.choices) ? payload.choices as Record<string, unknown>[] : [];
  const firstChoice = choices.length ? choices[0] : null;
  const message = firstChoice && firstChoice.message && typeof firstChoice.message === 'object'
    ? firstChoice.message as Record<string, unknown>
    : null;
  const content = message && typeof message.content === 'string' ? message.content : '';
  if (content) return content;
  if (firstChoice && typeof firstChoice.text === 'string') return firstChoice.text;
  if (payload && typeof payload.output_text === 'string') return payload.output_text;
  return '';
}

function extractGeminiContent(data: unknown): string {
  const payload = data as Record<string, unknown> | null;
  const candidates = payload && Array.isArray(payload.candidates) ? payload.candidates as Record<string, unknown>[] : [];
  const firstCandidate = candidates.length ? candidates[0] : null;
  const candidateContent = firstCandidate && firstCandidate.content && typeof firstCandidate.content === 'object'
    ? firstCandidate.content as Record<string, unknown>
    : null;
  const parts = candidateContent && Array.isArray(candidateContent.parts)
    ? candidateContent.parts as Record<string, unknown>[]
    : [];
  const firstPart = parts.length ? parts[0] : null;
  if (firstPart && typeof firstPart.text === 'string') return firstPart.text;
  if (payload && typeof payload.text === 'string') return payload.text;
  return '';
}

function extractOllamaContent(data: unknown): string {
  const payload = data as Record<string, unknown> | null;
  if (payload && typeof payload.response === 'string') return payload.response;
  return '';
}

/** 调用配置好的 AI 提供商 */
export async function callAIText(
  prompt: string,
  settings?: AISettings,
  options?: AITextCallOptions
): Promise<string> {
  const normalized = settings ? sanitizeSettings(settings) : loadAISettings();
  const issue = validateAISettings(normalized);
  if (issue) throw new Error(issue);

  const temperature = options?.temperature ?? 0.2;
  const maxTokens = options?.maxTokens ?? 2048;

  let response: Response;
  let responseText = '';

  if (normalized.provider === 'gemini') {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(normalized.gemini.model) +
      ':generateContent?key=' + encodeURIComponent(normalized.gemini.apiKey);

    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini 请求失败: ' + response.status + ' ' + response.statusText);
    }

    responseText = extractGeminiContent(await response.json());
  } else if (normalized.provider === 'ollama') {
    response = await fetch(normalized.ollama.endpoint.replace(/\/+$/, '') + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: normalized.ollama.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama 请求失败: ' + response.status + ' ' + response.statusText);
    }

    responseText = extractOllamaContent(await response.json());
  } else {
    const endpoint = normalizeOpenAIChatEndpoint(normalized.openaiCompatible.endpoint);
    if (!endpoint) throw new Error('OpenAI 兼容 API Base URL 未设置');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (normalized.openaiCompatible.apiKey) {
      headers.Authorization = 'Bearer ' + normalized.openaiCompatible.apiKey;
    }

    response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: normalized.openaiCompatible.model,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI 兼容 API 请求失败: ' + response.status + ' ' + response.statusText);
    }

    responseText = extractOpenAIContent(await response.json());
  }

  responseText = String(responseText || '').trim();
  if (!responseText) {
    throw new Error('AI 返回为空');
  }
  return responseText;
}

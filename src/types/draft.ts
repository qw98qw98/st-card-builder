import type { WorldbookEntry } from './worldbook';
import type { ImportedCardMeta, ImportedWorldbookMeta, RegexScript, ScriptTree } from './character-card';

/** 状态栏数据 */
export interface StatusBarData {
  description: string;
  presetStatusBlock: string;
}

/** 草稿数据 */
export interface DraftData {
  charName: string;
  wbName: string;
  charDesc: string;
  firstMes: string;
  creatorNotes: string;
  worldbookEntries: WorldbookEntry[];
  regexScripts: RegexScript[];
  tavernHelperScripts: ScriptTree[];
  avatarSrc: string;
  avatarBase64: string;
  altGreetings: string[];
  importedCardMeta: ImportedCardMeta | null;
  importedWorldbookMeta: ImportedWorldbookMeta | null;
  statusBarData: StatusBarData;
  updatedAt: string;
  updatedAtTs: number;
}

/** 字段信息 — FIELD_DICT */
export interface FieldInfo {
  label: string;
  tip: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  required?: boolean;
  enum?: string[];
  range?: { min?: number; max?: number };
}

/** 校验结果 */
export interface ValidationResult {
  path: string;
  message: string;
  value: unknown;
}

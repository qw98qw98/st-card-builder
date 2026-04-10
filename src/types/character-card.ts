import type { CharacterBook, WorldbookEntry } from './worldbook';

/** 香草导出支持的位置值 */
export type VanillaWorldbookPosition = 'before_char' | 'after_char';

/** SillyTavern V3 角色卡 */
export interface SillyTavernCard {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  data: CharacterData;
}

export interface CharacterData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  alternate_greetings: string[];
  character_book: CharacterBook;
  tags: string[];
  creator: string;
  character_version: string;
  nickname: string;
  gender: string;
  statusBlockConfig: StatusBlockConfig;
  presetStatusBlock: string;
  extensions: Extensions;
}

export interface StatusBlockConfig {
  description: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface Extensions {
  world?: string;
  regex_scripts?: RegexScript[];
  tavern_helper?: TavernHelper;
}

export interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  /** [1=输出, 2=输入] */
  placement: number[];
  disabled: boolean;
  runOnEdit: boolean;
}

export interface TavernHelper {
  scripts: ScriptTree[];
}

export interface ScriptTree {
  type: 'script';
  enabled: boolean;
  name: string;
  id: string;
  content: string;
  info: string;
  button: { enabled: boolean; buttons: unknown[] };
  data: Record<string, unknown>;
}

/** 导入角色卡时的元数据 */
export interface ImportedCardMeta {
  personality: string;
  scenario: string;
  mesExample: string;
  tags: string[];
  creator: string;
  characterVersion: string;
  nickname: string;
  gender: string;
  statusBlockConfig: StatusBlockConfig;
  presetStatusBlock: string;
  characterBookDescription: string;
  characterBookScanDepth: number;
  characterBookTokenBudget: number;
  characterBookRecursiveScanning: boolean;
}

/** 导入世界书时的元数据 */
export interface ImportedWorldbookMeta {
  sourceFormat: 'quick-reply-bundle' | 'worldbook';
  worldbookDescription: string;
  worldbookScanDepth: number;
  worldbookTokenBudget: number;
  worldbookRecursiveScanning: boolean;
  worldbookColor?: string;
  worldbookOnlyBorderColor?: boolean;
  worldbookDisableSend?: boolean;
  worldbookPlaceBeforeInput?: boolean;
  worldbookInjectInput?: boolean;
  worldbookIdIndex?: number;
  quickReplyCount: number;
  quickReplies: unknown[];
}

/** Vanilla 格式导出 */
export interface VanillaCharacterCard {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  alternate_greetings: string[];
  character_book: ExportedCharacterBook;
  tags: string[];
  creator: string;
  character_version: string;
  nickname: string;
  gender: string;
  statusBlockConfig: StatusBlockConfig;
}

export interface ExportedCharacterBook {
  name: string;
  description: string;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  extensions: Record<string, unknown>;
  entries: ExportedWorldbookEntry[];
}

export interface ExportedWorldbookEntry {
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  extensions: Record<string, unknown>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive: boolean;
  name: string;
  priority: number;
  id: number;
  selective: boolean;
  constant: boolean;
  /** ST 导出保留数字；香草导出会写入 before_char / after_char */
  position: number | VanillaWorldbookPosition;
}

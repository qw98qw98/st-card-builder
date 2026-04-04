/** 世界书条目 — normalizeWorldbookEntry 的完整字段 */
export interface WorldbookEntry {
  comment: string;
  content: string;
  keys: string[];
  secondaryKeys: string[];
  strategy: 'selective' | 'constant' | 'vectorized';
  /** 0-6 */
  position: number;
  depth: number;
  /** 0=系统, 1=用户, 2=助手 */
  role: 0 | 1 | 2;
  order: number;
  prob: number;
  enabled: boolean;
  disable: boolean;
  addMemo: boolean;
  ignoreBudget: boolean;
  useRegex: boolean;
  caseSensitive: boolean;
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;
  useGroupScoring: boolean | null;
  /** 0=AND, 1=NOT, 2=OR, 3=NOT AND */
  selectiveLogic: 0 | 1 | 2 | 3;
  group: string;
  groupWeight: number;
  useProbability: boolean;
  matchWholeWords: boolean | null;
  automationId: string;
  sticky: number;
  cooldown: number;
  delay: number;
  triggers: unknown[];
  displayIndex: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean;
  groupOverride: boolean;
  vectorized: boolean;
  outletName: string;
  characterFilter: string | null;
  raw: unknown | null;
  source: 'manual' | 'ai' | 'import';
}

/** 角色书 */
export interface CharacterBook {
  name: string;
  description: string;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  extensions: Record<string, unknown>;
  entries: WorldbookEntry[];
}

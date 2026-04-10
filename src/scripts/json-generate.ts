import type { WorldbookEntry } from '../types/worldbook';
import type {
  SillyTavernCard,
  VanillaCharacterCard,
  ExportedCharacterBook,
  ExportedWorldbookEntry,
  ImportedCardMeta,
  ImportedWorldbookMeta,
  VanillaWorldbookPosition,
} from '../types/character-card';
import { safeInt } from './utils/safe-int';
import { toVanillaWorldbookPosition } from './worldbook/position';

// ============================================================
//  JSON 导出生成
// ============================================================

/** 导出参数 */
export interface ExportContext {
  charName: string;
  charDesc: string;
  firstMes: string;
  creatorNotes: string;
  wbName: string;
  worldbookEntries: WorldbookEntry[];
  altGreetings: string[];
  importedCardMeta: ImportedCardMeta | null;
  importedWorldbookMeta: ImportedWorldbookMeta | null;
}

type ExportWorldbookFormat = 'sillytavern' | 'vanilla';

function mapExportWorldbookPosition(
  value: unknown,
  format: ExportWorldbookFormat
): number | VanillaWorldbookPosition {
  if (format === 'vanilla') return toVanillaWorldbookPosition(value);
  return safeInt(value, 4);
}

/** 将 WorldbookEntry[] 转为导出用的 entries 数组 */
export function buildExportWorldbookEntries(
  worldbookEntries: WorldbookEntry[],
  format: ExportWorldbookFormat = 'sillytavern'
): ExportedWorldbookEntry[] {
  return worldbookEntries.map(function (e, i) {
    const keys = Array.isArray(e.keys) ? e.keys.slice() : [];
    const secondaryKeys = Array.isArray(e.secondaryKeys) ? e.secondaryKeys.slice() : [];
    const comment = String(e.comment || '');
    const content = String(e.content || '');
    const isConstant = e.strategy === 'constant';
    const isSelective = isConstant ? false : (keys.length > 0 || e.strategy === 'selective' || e.strategy === 'vectorized' || !!e.vectorized);
    const enabled = e.disable !== true && e.enabled !== false;
    return {
      keys: keys,
      secondary_keys: secondaryKeys,
      comment: comment,
      content: content,
      extensions: {},
      enabled: enabled,
      insertion_order: safeInt(e.order, 100),
      case_sensitive: e.caseSensitive !== undefined ? !!e.caseSensitive : false,
      name: comment,
      priority: safeInt(e.prob, 100),
      id: i,
      selective: isSelective,
      constant: isConstant,
      position: mapExportWorldbookPosition(e.position, format),
    };
  });
}

/**
 * 将单条世界书条目压缩为「香草导入」真正会用到的最小字段集。
 * 用于“复制JSON”这类单条导入场景，避免把内部冗余字段也一起带出去。
 */
export interface VanillaWorldbookEntryCopy {
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  enabled: boolean;
  insertion_order: number;
  case_sensitive: boolean;
  priority: number;
  selective: boolean;
  constant: boolean;
  position: VanillaWorldbookPosition;
}

export function buildVanillaWorldbookEntryCopy(
  worldbookEntry: WorldbookEntry | null | undefined
): VanillaWorldbookEntryCopy {
  const e = worldbookEntry || ({} as WorldbookEntry);
  const keys = Array.isArray(e.keys) ? e.keys.slice() : [];
  const secondaryKeys = Array.isArray(e.secondaryKeys) ? e.secondaryKeys.slice() : [];
  const comment = String(e.comment || '');
  const content = String(e.content || '');
  const isConstant = e.strategy === 'constant';
  const isSelective = isConstant ? false : (keys.length > 0 || e.strategy === 'selective' || e.strategy === 'vectorized' || !!e.vectorized);
  const enabled = e.disable !== true && e.enabled !== false;

  return {
    keys: keys,
    secondary_keys: secondaryKeys,
    comment: comment,
    content: content,
    enabled: enabled,
    insertion_order: safeInt(e.order, 100),
    case_sensitive: e.caseSensitive !== undefined ? !!e.caseSensitive : false,
    priority: safeInt(e.prob, 100),
    selective: isSelective,
    constant: isConstant,
    position: toVanillaWorldbookPosition(e.position),
  };
}

/** 合并 importedCardMeta 和 importedWorldbookMeta 为一个扁平 meta 对象 */
function mergeMeta(
  importedCardMeta: ImportedCardMeta | null,
  importedWorldbookMeta: ImportedWorldbookMeta | null
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (importedWorldbookMeta) {
    Object.keys(importedWorldbookMeta).forEach(function (key) {
      meta[key] = (importedWorldbookMeta as unknown as Record<string, unknown>)[key];
    });
  }
  if (importedCardMeta) {
    Object.keys(importedCardMeta).forEach(function (key) {
      meta[key] = (importedCardMeta as unknown as Record<string, unknown>)[key];
    });
  }
  return meta;
}

/** 构建导出用的 character_book 对象 */
export function buildExportCharacterBook(
  ctx: ExportContext,
  format: ExportWorldbookFormat = 'sillytavern'
): ExportedCharacterBook {
  const meta = mergeMeta(ctx.importedCardMeta, ctx.importedWorldbookMeta);
  return {
    name: ctx.wbName || '',
    description: (meta.characterBookDescription as string) || (meta.worldbookDescription as string) || '',
    scan_depth: meta.characterBookScanDepth !== undefined ? (meta.characterBookScanDepth as number) : (meta.worldbookScanDepth !== undefined ? (meta.worldbookScanDepth as number) : 3),
    token_budget: meta.characterBookTokenBudget !== undefined ? (meta.characterBookTokenBudget as number) : (meta.worldbookTokenBudget !== undefined ? (meta.worldbookTokenBudget as number) : 1800000000),
    recursive_scanning: meta.characterBookRecursiveScanning !== undefined ? !!meta.characterBookRecursiveScanning : (meta.worldbookRecursiveScanning !== undefined ? !!meta.worldbookRecursiveScanning : true),
    extensions: {},
    entries: buildExportWorldbookEntries(ctx.worldbookEntries, format),
  };
}

/** 生成 SillyTavern V3 角色卡 JSON */
export function generateSillyTavernJSON(ctx: ExportContext): SillyTavernCard {
  const cn = ctx.charName || '';
  const altG = (ctx.altGreetings || []).filter(function (g) { return g && g.trim(); });
  const meta = mergeMeta(ctx.importedCardMeta, ctx.importedWorldbookMeta);
  const tags = Array.isArray(meta.tags) ? (meta.tags as unknown[]).slice() : [];
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: cn,
      description: ctx.charDesc || '',
      personality: (meta.personality as string) || '',
      scenario: (meta.scenario as string) || '',
      first_mes: ctx.firstMes || '',
      mes_example: (meta.mesExample as string) || '',
      creator_notes: ctx.creatorNotes || '',
      alternate_greetings: altG,
      character_book: buildExportCharacterBook(ctx) as unknown as SillyTavernCard['data']['character_book'],
      tags: tags as string[],
      creator: (meta.creator as string) || '',
      character_version: (meta.characterVersion as string) || '1.0.0',
      nickname: (meta.nickname as string) || cn || '',
      gender: (meta.gender as string) || '',
      statusBlockConfig: (meta.statusBlockConfig as SillyTavernCard['data']['statusBlockConfig']) || { description: '' },
      presetStatusBlock: (meta.presetStatusBlock as string) || '',
      extensions: {},
    },
  };
}

/** 生成 Vanilla 格式角色卡 JSON */
export function generateVanillaCharacterJSON(ctx: ExportContext): VanillaCharacterCard {
  const cn = ctx.charName || '';
  const altG = (ctx.altGreetings || []).filter(function (g) { return g && g.trim(); });
  const meta = mergeMeta(ctx.importedCardMeta, ctx.importedWorldbookMeta);
  return {
    name: cn,
    description: ctx.charDesc || '',
    personality: (meta.personality as string) || '',
    scenario: (meta.scenario as string) || '',
    first_mes: ctx.firstMes || '',
    mes_example: (meta.mesExample as string) || '',
    creator_notes: ctx.creatorNotes || '',
    alternate_greetings: altG,
    character_book: buildExportCharacterBook(ctx, 'vanilla'),
    tags: Array.isArray(meta.tags) ? (meta.tags as string[]).slice() : [],
    creator: (meta.creator as string) || '',
    character_version: (meta.characterVersion as string) || '1.0.0',
    nickname: (meta.nickname as string) || cn || '',
    gender: (meta.gender as string) || 'N/A',
    statusBlockConfig: (meta.statusBlockConfig as VanillaCharacterCard['statusBlockConfig']) || {
      description: '',
      properties: {},
      required: [],
    },
  };
}

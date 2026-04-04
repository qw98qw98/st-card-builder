import type { WorldbookEntry } from '../../types/worldbook';
import type { ImportedWorldbookMeta } from '../../types/character-card';
import { safeInt } from '../utils/safe-int';
import { normalizeWorldbookEntry } from './normalize';

// ============================================================
//  世界书导入工具函数
// ============================================================

/** 从文本中提取 JSON 片段（支持 markdown 围栏包裹） */
export function extractWorldbookImportJSON(text: string): string {
  let raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return '';
  if (raw[0] !== '{' && raw[0] !== '[') {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence && fence[1]) {
      raw = fence[1].trim();
    }
  }
  return raw;
}

/** 在文本中查找匹配的 JSON 边界（括号配对） */
function findJsonBounds(
  text: string,
  openChar: string,
  closeChar: string
): [number, number] | null {
  const start = text.indexOf(openChar);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return [start, i + 1];
    }
  }
  return null;
}

/** 解析世界书导入 JSON 文本，返回解析后的对象 */
export function parseWorldbookImportJSON(text: string): unknown {
  const raw = extractWorldbookImportJSON(text);
  if (!raw) throw new Error('导入内容为空');
  const bounds = findJsonBounds(raw, '{', '}') || findJsonBounds(raw, '[', ']');
  if (bounds) {
    return JSON.parse(raw.slice(bounds[0], bounds[1]));
  }
  throw new Error('未找到可解析的 JSON 片段');
}

/** 从 payload 中提取世界书名称 */
export function getWorldbookImportName(
  payload: Record<string, unknown> | null | undefined,
  fallbackName?: string
): string {
  if (!payload || typeof payload !== 'object') return fallbackName || '';
  if (payload.originalData && typeof payload.originalData === 'object') {
    const orig = payload.originalData as Record<string, unknown>;
    if (orig.name && String(orig.name).trim()) {
      return String(orig.name).trim();
    }
  }
  if (payload.data && typeof payload.data === 'object') {
    const data = payload.data as Record<string, unknown>;
    if (data.character_book && typeof data.character_book === 'object') {
      const cb = data.character_book as Record<string, unknown>;
      if (cb.name && String(cb.name).trim()) {
        return String(cb.name).trim();
      }
    }
    if (data.extensions && typeof data.extensions === 'object') {
      const ext = data.extensions as Record<string, unknown>;
      if (ext.world && String(ext.world).trim()) {
        return String(ext.world).trim();
      }
    }
  }
  if (payload.character_book && typeof payload.character_book === 'object') {
    const cb = payload.character_book as Record<string, unknown>;
    if (cb.name && String(cb.name).trim()) {
      return String(cb.name).trim();
    }
  }
  if (payload.name && String(payload.name).trim()) return String(payload.name).trim();
  return fallbackName || '';
}

/** 从 payload 中提取世界书元数据 */
export function getImportedWorldbookMeta(
  payload: Record<string, unknown> | null | undefined
): ImportedWorldbookMeta {
  payload = payload || {};
  const source = (payload.data && typeof payload.data === 'object' && (payload.data as Record<string, unknown>).character_book)
    ? (payload.data as Record<string, unknown>).character_book as Record<string, unknown>
    : payload;
  const original = (payload.originalData || {}) as Record<string, unknown>;
  return {
    sourceFormat: Array.isArray(payload.qrList) && (payload.qrList as unknown[]).length ? 'quick-reply-bundle' : 'worldbook',
    worldbookDescription: String(source.description || original.description || '').trim(),
    worldbookScanDepth: source.scan_depth !== undefined ? safeInt(source.scan_depth, 3) : (original.scan_depth !== undefined ? safeInt(original.scan_depth, 3) : 3),
    worldbookTokenBudget: source.token_budget !== undefined ? safeInt(source.token_budget, 1800000000) : (original.token_budget !== undefined ? safeInt(original.token_budget, 1800000000) : 1800000000),
    worldbookRecursiveScanning: source.recursive_scanning !== undefined ? !!source.recursive_scanning : (original.recursive_scanning !== undefined ? !!original.recursive_scanning : true),
    worldbookColor: (payload.color as string) || '',
    worldbookOnlyBorderColor: payload.onlyBorderColor !== undefined ? !!payload.onlyBorderColor : false,
    worldbookDisableSend: payload.disableSend !== undefined ? !!payload.disableSend : false,
    worldbookPlaceBeforeInput: payload.placeBeforeInput !== undefined ? !!payload.placeBeforeInput : false,
    worldbookInjectInput: payload.injectInput !== undefined ? !!payload.injectInput : false,
    worldbookIdIndex: payload.idIndex !== undefined ? safeInt(payload.idIndex, 0) : 0,
    quickReplyCount: Array.isArray(payload.qrList) ? (payload.qrList as unknown[]).length : 0,
    quickReplies: Array.isArray(payload.qrList) ? (payload.qrList as unknown[]).slice() : [],
  };
}

/** 从 payload 中提取世界书条目数组（已标准化） */
export function getImportedWorldbookEntries(
  payload: Record<string, unknown> | null | undefined
): WorldbookEntry[] {
  if (!payload) return [];

  let container: unknown = payload;
  if (payload.data && typeof payload.data === 'object' && (payload.data as Record<string, unknown>).character_book) {
    container = (payload.data as Record<string, unknown>).character_book;
  } else if (payload.character_book) {
    container = payload.character_book;
  }

  let entries: unknown[] = [];
  if (Array.isArray(container)) {
    entries = (container as unknown[]).slice();
  } else if (container && typeof container === 'object' && Array.isArray((container as Record<string, unknown>).entries)) {
    entries = ((container as Record<string, unknown>).entries as unknown[]).slice();
  } else if (container && typeof container === 'object' && (container as Record<string, unknown>).entries && typeof (container as Record<string, unknown>).entries === 'object') {
    const containerEntries = (container as Record<string, unknown>).entries as Record<string, unknown>;
    entries = Object.keys(containerEntries)
      .sort(function (a, b) {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b), 'zh-Hans-CN');
        return na - nb;
      })
      .map(function (key) {
        return containerEntries[key];
      })
      .filter(function (entry) { return entry !== undefined && entry !== null; });
  } else if (Array.isArray(payload.entries)) {
    entries = (payload.entries as unknown[]).slice();
  } else if (payload.entries && typeof payload.entries === 'object') {
    const payloadEntries = payload.entries as Record<string, unknown>;
    entries = Object.keys(payloadEntries)
      .sort(function (a, b) {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b), 'zh-Hans-CN');
        return na - nb;
      })
      .map(function (key) {
        return payloadEntries[key];
      })
      .filter(function (entry) { return entry !== undefined && entry !== null; });
  } else if (payload.originalData && Array.isArray((payload.originalData as Record<string, unknown>).entries)) {
    entries = ((payload.originalData as Record<string, unknown>).entries as unknown[]).slice();
  } else if (payload.originalData && typeof payload.originalData === 'object' && (payload.originalData as Record<string, unknown>).entries && typeof (payload.originalData as Record<string, unknown>).entries === 'object') {
    const origEntries = (payload.originalData as Record<string, unknown>).entries as Record<string, unknown>;
    entries = Object.keys(origEntries)
      .sort(function (a, b) {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b), 'zh-Hans-CN');
        return na - nb;
      })
      .map(function (key) {
        return origEntries[key];
      })
      .filter(function (entry) { return entry !== undefined && entry !== null; });
  }

  if (!entries.length && Array.isArray(payload.qrList)) {
    entries = (payload.qrList as Record<string, unknown>[]).map(function (item, index) {
      const label = String(item && (item.label || item.title || item.name) || '').trim();
      const message = String(item && item.message || '').trim();
      return {
        comment: label || ('快速回复 ' + String(index + 1)),
        content: message,
        keys: [],
        secondaryKeys: [],
        strategy: 'constant',
        position: 4,
        depth: 4,
        role: 0,
        order: safeInt(item && item.id, index + 1),
        prob: 100,
        enabled: true,
        disable: false,
        addMemo: false,
        ignoreBudget: false,
        useRegex: false,
        caseSensitive: false,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        selectiveLogic: 0,
        group: '',
        groupWeight: 100,
        useProbability: true,
        matchWholeWords: null,
        automationId: '',
        sticky: 0,
        cooldown: 0,
        delay: 0,
        triggers: [],
        displayIndex: index,
        excludeRecursion: false,
        preventRecursion: false,
        delayUntilRecursion: false,
        groupOverride: false,
        vectorized: false,
        outletName: '',
        characterFilter: null,
        raw: item || null,
        source: 'import',
      } as unknown;
    });
  }

  return entries.map(function (rawEntry, index) {
    const entry = rawEntry as Record<string, unknown> | null;
    const ext = entry && entry.extensions ? (entry.extensions as Record<string, unknown>) : {};
    const keys = Array.isArray(entry?.keys)
      ? (entry!.keys as unknown[]).slice()
      : Array.isArray(entry?.key)
        ? (entry!.key as unknown[]).slice()
        : [];
    const secondaryKeys = Array.isArray(entry?.secondary_keys)
      ? (entry!.secondary_keys as unknown[]).slice()
      : Array.isArray(entry?.keysecondary)
        ? (entry!.keysecondary as unknown[]).slice()
        : [];
    const vectorized = !!(entry && (entry.vectorized || ext.vectorized));
    const constant = !!(entry && entry.constant);
    const strategy = entry && entry.strategy
      ? entry.strategy
      : (constant ? 'constant' : (vectorized ? 'vectorized' : 'selective'));
    const disable = entry && entry.disable !== undefined ? !!entry.disable : (entry && entry.enabled !== undefined ? !entry.enabled : false);

    return normalizeWorldbookEntry({
      comment: entry && (entry.comment || entry.title || entry.name) || '',
      content: entry && entry.content || '',
      keys: keys,
      secondaryKeys: secondaryKeys,
      strategy: strategy,
      position: safeInt(ext.position !== undefined ? ext.position : entry && entry.position, 4),
      depth: safeInt(ext.depth !== undefined ? ext.depth : entry && entry.depth, 4),
      role: safeInt(ext.role !== undefined ? ext.role : entry && entry.role, 0),
      order: safeInt(entry && (entry.insertion_order !== undefined ? entry.insertion_order : entry.order), 100),
      prob: safeInt(ext.probability !== undefined ? ext.probability : entry && (entry.probability !== undefined ? entry.probability : entry.prob), 100),
      enabled: entry && entry.enabled !== undefined ? !!entry.enabled : !disable,
      disable: disable,
      addMemo: entry && entry.addMemo !== undefined ? !!entry.addMemo : !!(entry && entry.add_memo),
      ignoreBudget: entry && entry.ignoreBudget !== undefined ? !!entry.ignoreBudget : !!(entry && entry.ignore_budget),
      useRegex: entry && entry.use_regex !== undefined ? !!entry.use_regex : !!(entry && entry.useRegex),
      selectiveLogic: safeInt(ext.selectiveLogic !== undefined ? ext.selectiveLogic : entry && entry.selectiveLogic, 0),
      group: ext.group || (entry && entry.group) || '',
      groupWeight: safeInt(ext.group_weight !== undefined ? ext.group_weight : entry && entry.group_weight, 100),
      useProbability: ext.useProbability !== undefined ? !!ext.useProbability : true,
      matchPersonaDescription: entry && entry.matchPersonaDescription !== undefined ? !!entry.matchPersonaDescription : !!(entry && entry.match_persona_description),
      matchCharacterDescription: entry && entry.matchCharacterDescription !== undefined ? !!entry.matchCharacterDescription : !!(entry && entry.match_character_description),
      matchCharacterPersonality: entry && entry.matchCharacterPersonality !== undefined ? !!entry.matchCharacterPersonality : !!(entry && entry.match_character_personality),
      matchCharacterDepthPrompt: entry && entry.matchCharacterDepthPrompt !== undefined ? !!entry.matchCharacterDepthPrompt : !!(entry && entry.match_character_depth_prompt),
      matchScenario: entry && entry.matchScenario !== undefined ? !!entry.matchScenario : !!(entry && entry.match_scenario),
      matchCreatorNotes: entry && entry.matchCreatorNotes !== undefined ? !!entry.matchCreatorNotes : !!(entry && entry.match_creator_notes),
      excludeRecursion: ext.exclude_recursion !== undefined ? !!ext.exclude_recursion : !!(entry && entry.excludeRecursion),
      preventRecursion: ext.prevent_recursion !== undefined ? !!ext.prevent_recursion : !!(entry && entry.preventRecursion),
      delayUntilRecursion: ext.delay_until_recursion !== undefined ? !!ext.delay_until_recursion : !!(entry && entry.delayUntilRecursion),
      groupOverride: ext.group_override !== undefined ? !!ext.group_override : !!(entry && entry.groupOverride),
      vectorized: vectorized,
      outletName: ext.outlet_name || (entry && entry.outletName) || '',
      matchWholeWords: ext.match_whole_words !== undefined ? !!ext.match_whole_words : (entry && entry.matchWholeWords !== undefined ? !!entry.matchWholeWords : null),
      useGroupScoring: ext.use_group_scoring !== undefined ? !!ext.use_group_scoring : (entry && entry.useGroupScoring !== undefined ? !!entry.useGroupScoring : null),
      automationId: ext.automation_id || (entry && entry.automationId) || '',
      sticky: safeInt(entry && entry.sticky !== undefined ? entry.sticky : ext.sticky, 0),
      cooldown: safeInt(entry && entry.cooldown !== undefined ? entry.cooldown : ext.cooldown, 0),
      delay: safeInt(entry && entry.delay !== undefined ? entry.delay : ext.delay, 0),
      triggers: Array.isArray(entry?.triggers) ? (entry!.triggers as unknown[]).slice() : [],
      displayIndex: safeInt(entry && entry.displayIndex !== undefined ? entry.displayIndex : ext.display_index, index),
      characterFilter: entry && entry.characterFilter ? entry.characterFilter : (ext.characterFilter || null),
      source: 'import',
    }, 'import');
  });
}

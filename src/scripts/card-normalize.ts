import { safeInt } from './utils/safe-int';
import { normalizeWorldbookEntry } from './worldbook/normalize';

// ============================================================
//  角色卡标准化 — 纯函数，无 DOM 依赖
// ============================================================

/** 获取角色卡数据的根 payload（兼容 data 包装层） */
export function getCardRootPayload(json: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!json || typeof json !== 'object') return null;
  if (json.data && typeof json.data === 'object') return json.data as Record<string, unknown>;
  return json;
}

/** 判断 JSON 是否是角色卡 payload */
export function isCharacterCardPayload(json: Record<string, unknown> | null | undefined): boolean {
  if (!json || typeof json !== 'object') return false;
  if (isPureWorldbookPayload(json)) return false;
  if (json.spec === 'chara_card_v3') return true;
  const data = json.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d.character_book || d.first_mes !== undefined || d.creator_notes !== undefined || d.mes_example !== undefined) {
      return true;
    }
    if (d.nickname !== undefined || d.gender !== undefined || d.statusBlockConfig !== undefined) {
      return true;
    }
  }
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : json;
  return !!(
    root &&
    typeof root === 'object' &&
    (
      root.first_mes !== undefined ||
      root.creator_notes !== undefined ||
      root.mes_example !== undefined ||
      root.alternate_greetings !== undefined ||
      root.character_book !== undefined ||
      root.nickname !== undefined ||
      root.gender !== undefined ||
      root.statusBlockConfig !== undefined ||
      root.personality !== undefined ||
      root.scenario !== undefined ||
      root.creator !== undefined ||
      root.character_version !== undefined
    )
  );
}

/** 判断 JSON 是否是纯世界书 payload（非角色卡） */
export function isPureWorldbookPayload(json: Record<string, unknown> | null | undefined): boolean {
  if (!json || typeof json !== 'object') return false;
  if (!json.entries) return false;

  const data = json.data;
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : json;
  if (!root || typeof root !== 'object') return false;

  return !(
    root.first_mes !== undefined ||
    root.creator_notes !== undefined ||
    root.mes_example !== undefined ||
    root.alternate_greetings !== undefined ||
    root.character_book !== undefined ||
    root.nickname !== undefined ||
    root.gender !== undefined ||
    root.statusBlockConfig !== undefined ||
    root.personality !== undefined ||
    root.scenario !== undefined ||
    root.creator !== undefined ||
    root.character_version !== undefined
  );
}

/** 将导入的 position 值统一为数字 */
function coerceImportedPosition(entry: Record<string, unknown> | null | undefined): number {
  if (!entry || typeof entry !== 'object') return 4;
  const ext = entry.extensions as Record<string, unknown> | undefined;
  if (ext && ext.position !== undefined) return safeInt(ext.position, 4);
  if (entry.position !== undefined) {
    if (entry.position === 'before_char') return 0;
    if (entry.position === 'after_char') return 4;
    return safeInt(entry.position, 4);
  }
  return 4;
}

/** 标准化头像 src — 只接受 data:URL、http(s) URL、绝对路径 */
function normalizeAvatarSrc(value: unknown): string {
  const str = String(value || '').trim();
  if (!str || str.toLowerCase() === 'none') return '';
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(str)) return str;
  if (/^https?:\/\//i.test(str) || /^\/\//.test(str) || /^\/[^/]/.test(str)) return str;
  return '';
}

/** 标准化后的角色卡数据 */
export interface NormalizedCard {
  charName: string;
  wbName: string;
  charDesc: string;
  personality: string;
  scenario: string;
  firstMes: string;
  mesExample: string;
  creatorNotes: string;
  tags: string[];
  creator: string;
  characterVersion: string;
  nickname: string;
  gender: string;
  statusBlockConfig: Record<string, unknown>;
  presetStatusBlock: string;
  worldbookEntries: ReturnType<typeof normalizeWorldbookEntry>[];
  regexScripts: Record<string, unknown>[];
  tavernHelperScripts: Record<string, unknown>[];
  altGreetings: string[];
  avatarSrc: string;
}

/** 将导入的角色卡 JSON 标准化为统一的内部结构 */
export function normalizeImportedCharacterCard(json: Record<string, unknown> | null | undefined): NormalizedCard | null {
  if (!json || typeof json !== 'object') return null;

  const root = getCardRootPayload(json);
  if (!root) return null;

  const hasCardFields = !!(
    json.spec === 'chara_card_v3' ||
    json.spec_version === '3.0' ||
    root.first_mes !== undefined ||
    root.creator_notes !== undefined ||
    root.mes_example !== undefined ||
    root.alternate_greetings !== undefined ||
    root.nickname !== undefined ||
    root.gender !== undefined ||
    root.statusBlockConfig !== undefined ||
    root.personality !== undefined ||
    root.scenario !== undefined ||
    root.creator !== undefined ||
    root.character_version !== undefined ||
    root.character_book !== undefined
  );
  if (!hasCardFields) return null;

  const name = String(root.name || json.name || '').trim();
  const desc = String(root.description || '').trim();
  const personality = String(root.personality || json.personality || '').trim();
  const scenario = String(root.scenario || json.scenario || '').trim();
  const first = String(root.first_mes || '').trim();
  const mesExample = String(root.mes_example || json.mes_example || '').trim();
  const notes = String(root.creator_notes || root.creatorcomment || '').trim();
  const ext = root.extensions as Record<string, unknown> | undefined;
  const cb = root.character_book as Record<string, unknown> | undefined;
  let wb = String((ext && ext.world) || (cb && cb.name) || json.wbName || '').trim();
  const altGreetings = Array.isArray(root.alternate_greetings) ? (root.alternate_greetings as string[]).slice() : [];
  const tags = Array.isArray(root.tags) ? (root.tags as string[]).slice() : (Array.isArray(json.tags) ? (json.tags as string[]).slice() : []);
  const creator = String(root.creator || json.creator || '').trim();
  const characterVersion = String(root.character_version || json.character_version || '').trim();
  const nickname = String(root.nickname || json.nickname || '').trim();
  const gender = String(root.gender || json.gender || '').trim();
  const statusBlockConfig = root.statusBlockConfig && typeof root.statusBlockConfig === 'object'
    ? root.statusBlockConfig as Record<string, unknown>
    : (json.statusBlockConfig && typeof json.statusBlockConfig === 'object'
      ? json.statusBlockConfig as Record<string, unknown>
      : { description: '' });
  const presetStatusBlock = String(root.presetStatusBlock || json.presetStatusBlock || '').trim();
  const regexScripts: Record<string, unknown>[] = [];
  const tavernHelperScripts: Record<string, unknown>[] = [];
  const avatarSrc = normalizeAvatarSrc(json.avatar || root.avatar || '');

  const characterBook = root.character_book || json.character_book || null;
  let entries: unknown[] = [];
  if (characterBook && typeof characterBook === 'object') {
    const book = characterBook as Record<string, unknown>;
    if (Array.isArray(book.entries)) {
      entries = (book.entries as unknown[]).slice();
      if (!wb && book.name) wb = String(book.name).trim();
    } else if (book.entries && typeof book.entries === 'object') {
      const bookEntries = book.entries as Record<string, unknown>;
      entries = Object.keys(bookEntries).map(function(key) { return bookEntries[key]; });
    }
  }

  return {
    charName: name,
    wbName: wb,
    charDesc: desc,
    personality: personality,
    scenario: scenario,
    firstMes: first,
    mesExample: mesExample,
    creatorNotes: notes,
    tags: tags,
    creator: creator,
    characterVersion: characterVersion,
    nickname: nickname,
    gender: gender,
    statusBlockConfig: statusBlockConfig,
    presetStatusBlock: presetStatusBlock,
    worldbookEntries: entries.map(function(rawE) {
      const e = rawE as Record<string, unknown> | null;
      const eExt = e && e.extensions ? e.extensions as Record<string, unknown> : {};
      return normalizeWorldbookEntry({
        comment: e && (e.comment || e.title || e.name) || '',
        content: e && e.content || '',
        keys: Array.isArray(e && e.keys) ? (e!.keys as unknown[]).slice() : [],
        secondaryKeys: Array.isArray(e && e.secondary_keys) ? (e!.secondary_keys as unknown[]).slice() : [],
        strategy: e && e.constant ? 'constant' : (e && e.vectorized ? 'vectorized' : (eExt && eExt.vectorized ? 'vectorized' : 'selective')),
        position: coerceImportedPosition(e),
        depth: (eExt && eExt.depth !== undefined) ? eExt.depth as number : 4,
        role: (eExt && eExt.role !== undefined) ? eExt.role as number : 0,
        order: e && e.insertion_order !== undefined ? e.insertion_order as number : (e && e.order !== undefined ? e.order as number : 100),
        prob: (eExt && eExt.probability !== undefined) ? eExt.probability as number : (e && e.priority !== undefined ? e.priority as number : 100),
        enabled: e && e.enabled !== undefined ? !!e.enabled : true,
        useRegex: !!(e && (e.use_regex || e.useRegex)),
        caseSensitive: !!(e && (e.case_sensitive || e.caseSensitive)),
        selectiveLogic: (eExt && eExt.selectiveLogic !== undefined) ? eExt.selectiveLogic as number : 0,
        group: (eExt && eExt.group) as string || '',
        groupWeight: (eExt && eExt.group_weight !== undefined) ? eExt.group_weight as number : 100,
        useProbability: (eExt && eExt.useProbability !== undefined) ? !!eExt.useProbability : true,
        excludeRecursion: !!(eExt && eExt.exclude_recursion),
        preventRecursion: !!(eExt && eExt.prevent_recursion),
        delayUntilRecursion: !!(eExt && eExt.delay_until_recursion),
        groupOverride: !!(eExt && eExt.group_override),
        vectorized: !!(eExt && eExt.vectorized),
        outletName: (eExt && eExt.outlet_name) as string || '',
        source: e && e.source || 'import'
      }, 'import');
    }),
    regexScripts: Array.isArray(ext && ext.regex_scripts) ? (ext!.regex_scripts as Record<string, unknown>[]).slice() : regexScripts,
    tavernHelperScripts: Array.isArray(ext && ext.tavern_helper && (ext!.tavern_helper as Record<string, unknown>).scripts)
      ? ((ext!.tavern_helper as Record<string, unknown>).scripts as Record<string, unknown>[]).slice()
      : tavernHelperScripts,
    altGreetings: altGreetings,
    avatarSrc: avatarSrc
  };
}

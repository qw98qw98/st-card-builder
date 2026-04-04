import { atom } from 'nanostores';
import type { WorldbookEntry } from '../types/worldbook';
import type {
  ImportedCardMeta,
  ImportedWorldbookMeta,
  RegexScript,
  ScriptTree,
} from '../types/character-card';
import type { StatusBarData } from '../types/draft';

/** 世界书条目列表 */
export const worldbookEntries = atom<WorldbookEntry[]>([]);

/** 正则脚本列表 */
export const regexScripts = atom<RegexScript[]>([]);

/** Tavern Helper 脚本列表 */
export const tavernHelperScripts = atom<ScriptTree[]>([]);

/** 替代问候语 */
export const altGreetings = atom<string[]>([]);

/** 当前头像 src (用于预览) */
export const currentAvatarSrc = atom<string>('');

/** 当前头像 base64 (用于导出) */
export const currentAvatarExportBase64 = atom<string>('');

/** 当前草稿 ID */
export const currentDraftId = atom<string>('');

/** 世界书编辑中的条目索引 (-1 表示无) */
export const editingIndex = atom<number>(-1);

/** 世界书浏览过滤 */
export const worldbookBrowseFilter = atom<'all' | 'ai' | 'manual' | 'import'>('all');

/** 世界书模式 (编辑/预览) */
export const worldbookMode = atom<'edit' | 'preview'>('edit');

/** 导入角色卡元数据 */
export const importedCardMeta = atom<ImportedCardMeta | null>(null);

/** 导入世界书元数据 */
export const importedWorldbookMeta = atom<ImportedWorldbookMeta | null>(null);

/** 状态栏数据 */
export const statusBarData = atom<StatusBarData | null>(null);

/** 选中的世界书条目索引 (-1 表示无) */
export const selectedWorldbookIndex = atom<number>(-1);

/** 全局更新触发器 — 递增以触发保存 */
export const triggerSaveCount = atom<number>(0);

/** 保存回调（由主脚本注册） */
let _saveHandler: (() => void) | null = null;
export function registerSaveHandler(fn: () => void): void {
  _saveHandler = fn;
}

/** 触发全局更新 (保存 + 预览刷新) */
export function triggerGlobalUpdate(): void {
  triggerSaveCount.set(triggerSaveCount.get() + 1);
  if (_saveHandler) _saveHandler();
}

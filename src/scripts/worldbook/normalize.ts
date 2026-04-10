import type { WorldbookEntry } from '../../types/worldbook';
import { safeInt } from '../utils/safe-int';
import { normalizeWorldbookPosition } from './position';

/**
 * 将原始世界书条目数据标准化为统一的 WorldbookEntry 结构。
 * 兼容 SillyTavern V2/V3、RisuAI、快速回复等多种来源字段名。
 */
export function normalizeWorldbookEntry(
  entry: Record<string, unknown> | null | undefined,
  fallbackSource?: 'manual' | 'ai' | 'import'
): WorldbookEntry {
  entry = entry || {};
  const extensions = (entry.extensions || {}) as Record<string, unknown>;
  return {
    comment: (entry.comment as string) || '',
    content: (entry.content as string) || '',
    keys: Array.isArray(entry.keys) ? (entry.keys as string[]).slice() : [],
    secondaryKeys: Array.isArray(entry.secondaryKeys)
      ? (entry.secondaryKeys as string[]).slice()
      : Array.isArray(entry.secondary_keys)
        ? (entry.secondary_keys as string[]).slice()
        : [],
    strategy: (entry.strategy as WorldbookEntry['strategy']) || 'selective',
    position: normalizeWorldbookPosition(entry.position, 4),
    depth: safeInt(entry.depth, 4),
    role: safeInt(entry.role, 0) as WorldbookEntry['role'],
    order: safeInt(entry.order !== undefined ? entry.order : entry.insertion_order, 100),
    prob: safeInt(entry.prob !== undefined ? entry.prob : entry.probability, 100),
    enabled: entry.enabled !== undefined ? !!entry.enabled : true,
    disable: entry.disable !== undefined ? !!entry.disable : (entry.enabled !== undefined ? !entry.enabled : false),
    addMemo: entry.addMemo !== undefined ? !!entry.addMemo : false,
    ignoreBudget: entry.ignoreBudget !== undefined ? !!entry.ignoreBudget : false,
    useRegex: entry.useRegex !== undefined ? !!entry.useRegex : !!entry.use_regex,
    caseSensitive: entry.caseSensitive !== undefined ? !!entry.caseSensitive : !!entry.case_sensitive,
    matchPersonaDescription: entry.matchPersonaDescription !== undefined ? !!entry.matchPersonaDescription : !!entry.match_persona_description,
    matchCharacterDescription: entry.matchCharacterDescription !== undefined ? !!entry.matchCharacterDescription : !!entry.match_character_description,
    matchCharacterPersonality: entry.matchCharacterPersonality !== undefined ? !!entry.matchCharacterPersonality : !!entry.match_character_personality,
    matchCharacterDepthPrompt: entry.matchCharacterDepthPrompt !== undefined ? !!entry.matchCharacterDepthPrompt : !!entry.match_character_depth_prompt,
    matchScenario: entry.matchScenario !== undefined ? !!entry.matchScenario : !!entry.match_scenario,
    matchCreatorNotes: entry.matchCreatorNotes !== undefined ? !!entry.matchCreatorNotes : !!entry.match_creator_notes,
    useGroupScoring: entry.useGroupScoring !== undefined ? !!entry.useGroupScoring : (extensions.use_group_scoring !== undefined ? !!extensions.use_group_scoring : null),
    selectiveLogic: safeInt(entry.selectiveLogic !== undefined ? entry.selectiveLogic : extensions.selectiveLogic, 0) as WorldbookEntry['selectiveLogic'],
    group: (entry.group as string) || (extensions.group as string) || '',
    groupWeight: safeInt(entry.groupWeight !== undefined ? entry.groupWeight : extensions.group_weight, 100),
    useProbability: entry.useProbability !== undefined ? !!entry.useProbability : (extensions.useProbability !== undefined ? !!extensions.useProbability : true),
    matchWholeWords: entry.matchWholeWords !== undefined ? !!entry.matchWholeWords : (extensions.match_whole_words !== undefined ? !!extensions.match_whole_words : null),
    automationId: (entry.automationId as string) || (extensions.automation_id as string) || '',
    sticky: safeInt(entry.sticky !== undefined ? entry.sticky : extensions.sticky, 0),
    cooldown: safeInt(entry.cooldown !== undefined ? entry.cooldown : extensions.cooldown, 0),
    delay: safeInt(entry.delay !== undefined ? entry.delay : extensions.delay, 0),
    triggers: Array.isArray(entry.triggers) ? (entry.triggers as unknown[]).slice() : [],
    displayIndex: safeInt(entry.displayIndex !== undefined ? entry.displayIndex : extensions.display_index, 0),
    excludeRecursion: entry.excludeRecursion !== undefined ? !!entry.excludeRecursion : !!extensions.exclude_recursion,
    preventRecursion: entry.preventRecursion !== undefined ? !!entry.preventRecursion : !!extensions.prevent_recursion,
    delayUntilRecursion: entry.delayUntilRecursion !== undefined ? !!entry.delayUntilRecursion : !!extensions.delay_until_recursion,
    groupOverride: entry.groupOverride !== undefined ? !!entry.groupOverride : !!extensions.group_override,
    vectorized: entry.vectorized !== undefined ? !!entry.vectorized : !!extensions.vectorized,
    outletName: (entry.outletName as string) || (extensions.outlet_name as string) || '',
    characterFilter: (entry.characterFilter as string | null) || null,
    raw: (entry.raw as unknown) || null,
    source: (entry.source as WorldbookEntry['source']) || fallbackSource || 'manual',
  };
}

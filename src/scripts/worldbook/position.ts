import { safeInt } from '../utils/safe-int';
import type { VanillaWorldbookPosition } from '../../types/character-card';

/** 将世界书位置统一为内部数字位置。香草 position 仅保留 before_char / after_char。 */
export function normalizeWorldbookPosition(value: unknown, fallback: number = 4): number {
  if (value === 'before_char') return 0;
  if (value === 'after_char') return 1;
  return safeInt(value, fallback);
}

/** 将内部数字位置压缩为香草支持的位置值。 */
export function toVanillaWorldbookPosition(value: unknown): VanillaWorldbookPosition {
  if (value === 'before_char' || value === 'after_char') return value;
  return normalizeWorldbookPosition(value, 4) === 0 ? 'before_char' : 'after_char';
}

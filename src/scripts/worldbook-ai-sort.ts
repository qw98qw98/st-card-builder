import { escapeHTML } from './utils/escape-html';
import { safeInt } from './utils/safe-int';
import { callAIText, buildAISettingsSummary, loadAISettings, validateAISettings } from './ai-settings';
import type { WorldbookEntry } from '../types/worldbook';
import type { WorldbookSortSuggestion } from '../types/ai';

// ============================================================
//  世界书 AI 排序建议
// ============================================================

type WorldbookAnalysisFormat = 'sillytavern' | 'vanilla';

export interface WorldbookAISortOptions {
  getEntries: () => WorldbookEntry[];
  commit: () => void;
  openSettings?: () => void;
  getWorldbookName?: () => string;
}

interface ModalStateRefs {
  modal: HTMLElement;
  analyzeBtn: HTMLButtonElement;
  applyBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement | null;
  jumpSettingsBtn: HTMLButtonElement | null;
  formatSelect: HTMLSelectElement | null;
  selectAll: HTMLInputElement | null;
  loadingState: HTMLElement;
  emptyState: HTMLElement;
  configState: HTMLElement;
  errorState: HTMLElement;
  resultsState: HTMLElement;
  configMessage: HTMLElement;
  errorMessage: HTMLElement;
  listEl: HTMLElement;
  countEl: HTMLElement;
  statusEl: HTMLElement;
}

let currentSuggestions: WorldbookSortSuggestion[] = [];

function clamp(value: number, min: number, max: number): number {
  if (isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeArrayText(value: unknown): string {
  if (Array.isArray(value)) return value.map(function (item) { return String(item || '').trim(); }).filter(Boolean).join('，');
  return String(value || '').trim();
}

function getAnalysisFormat(refs: ModalStateRefs): WorldbookAnalysisFormat {
  return refs.formatSelect && refs.formatSelect.value === 'vanilla' ? 'vanilla' : 'sillytavern';
}

function formatPositionLabel(position: number, format: WorldbookAnalysisFormat): string {
  if (format === 'vanilla') {
    return position === 0 ? 'before_char / 角色前' : 'after_char / 角色后';
  }
  const labels: Record<number, string> = {
    0: '角色前',
    1: '角色后',
    2: '前 EM',
    3: '后 EM',
    4: '深度插入',
    5: '作者注前',
    6: '作者注后',
  };
  return labels[position] || String(position);
}

function formatStrategyLabel(strategy: string, format: WorldbookAnalysisFormat): string {
  if (strategy === 'constant') return '常驻（始终启用）';
  if (format === 'vanilla') return '选择性触发';
  if (strategy === 'vectorized') return '向量化';
  return '关键词触发';
}

function parseAIPositionSuggestion(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (raw === 'before_char' || raw === 'after_char') {
    return raw === 'before_char' ? 0 : 1;
  }
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? undefined : clamp(parsed, 0, 6);
}

function summarizeEntry(entry: WorldbookEntry, index: number): Record<string, unknown> {
  const content = String(entry.content || '').replace(/\s+/g, ' ').trim();
  const contentPreview = content.length > 220 ? content.slice(0, 220) + '…' : content;

  return {
    index: index,
    title: String(entry.comment || '').trim() || '未命名条目',
    keys: Array.isArray(entry.keys) ? entry.keys.slice() : [],
    contentPreview: contentPreview,
    current: {
      strategy: entry.strategy || 'selective',
      position: safeInt(entry.position, 4),
      depth: safeInt(entry.depth, 4),
      role: safeInt(entry.role, 0),
      order: safeInt(entry.order, 100),
      prob: safeInt(entry.prob, 100),
      priority: safeInt(entry.prob, 100),
      enabled: entry.enabled !== false,
      source: entry.source || 'manual',
    },
  };
}

export function buildWorldbookSortPrompt(
  entries: WorldbookEntry[],
  worldbookName?: string,
  format: WorldbookAnalysisFormat = 'sillytavern'
): string {
  const list = (Array.isArray(entries) ? entries : []).map(function (entry, index) {
    return summarizeEntry(entry, index);
  });

  const isVanilla = format === 'vanilla';

  return [
    '你是一个熟悉 SillyTavern 世界书结构的整理助手。',
    '请根据每条世界书条目的实际内容，判断其在上下文中的重要性，并给出最合适的排序相关建议。',
    '',
    '目标：',
    '1. 核心世界观、主角、主线、关键规则、常驻设定更靠后、权重更高。',
    '2. 地点、组织、常见角色、常规补充设定居中。',
    '3. 一次性 NPC、低频道具、琐碎背景信息更靠前、权重更低。',
    '4. 如果条目几乎总是需要注入，建议 strategy=constant。',
    '5. 如果条目只有在关键词命中时才注入，建议 strategy=selective。',
    '',
    ...(isVanilla
      ? [
        '字段说明：',
        '- position: before_char=角色前, after_char=角色后',
        '- order 数值越大，表示同一 position 内越靠后、影响越强；建议使用 10/20/30 之类的梯度值。',
        '- priority 是优先级；当超出 token budget 时，priority 数值越高越优先保留。',
        '',
        '请只输出 JSON 数组，不要输出任何解释、markdown 或代码块。',
        '数组元素格式如下：',
        '{',
        '  "index": 0,',
        '  "suggestedPosition": "before_char",',
        '  "suggestedOrder": 200,',
        '  "suggestedPriority": 100,',
        '  "suggestedStrategy": "constant",',
        '  "reason": "简短中文原因"',
        '}',
      ]
      : [
        '字段说明：',
        '- position: 0=角色前, 1=角色后, 2=前 EM, 3=后 EM, 4=深度插入, 5=作者注前, 6=作者注后。', '- 如果最终要导出香草格式，导出层会自动折叠为 before_char / after_char；这里仍然请输出数字 position。',
        '- position=4 时，role 代表 0=系统, 1=用户, 2=助手，depth 代表深度层级。',
        '- order 数值越大，表示同一 position 内越靠后、影响越强；建议使用 10/20/30 之类的梯度值。',
        '- prob 是触发概率，核心条目建议更高，次要条目可适当降低。',
        '',
        '请只输出 JSON 数组，不要输出任何解释、markdown 或代码块。',
        '数组元素格式如下：',
        '{',
        '  "index": 0,',
        '  "suggestedPosition": 4,',
        '  "suggestedRole": 0,',
        '  "suggestedDepth": 2,',
        '  "suggestedOrder": 200,',
        '  "suggestedProb": 100,',
        '  "suggestedStrategy": "constant",',
        '  "reason": "简短中文原因"',
        '}',
      ]),
    '只返回需要调整的条目；如果某条无需修改，就不要返回。',
    worldbookName ? ('世界书名称：' + worldbookName) : '',
    '',
    '世界书条目列表：',
    JSON.stringify(list, null, 2),
  ].filter(Boolean).join('\n');
}

function extractJsonCandidate(text: string): string {
  let raw = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!raw) return '';

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence && fence[1]) {
    raw = fence[1].trim();
  }

  const firstArray = raw.indexOf('[');
  const lastArray = raw.lastIndexOf(']');
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    return raw.slice(firstArray, lastArray + 1);
  }

  const firstObject = raw.indexOf('{');
  const lastObject = raw.lastIndexOf('}');
  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    return raw.slice(firstObject, lastObject + 1);
  }

  return raw;
}

function normalizeSuggestion(raw: unknown): WorldbookSortSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const index = safeInt(
    item.index !== undefined ? item.index : (item.id !== undefined ? item.id : item.entryIndex),
    -1
  );
  if (index < 0) return null;

  const strategyRaw = String(item.suggestedStrategy || item.strategy || '').trim();
  const strategy = strategyRaw === 'constant' || strategyRaw === 'vectorized' || strategyRaw === 'selective'
    ? strategyRaw
    : undefined;

  const reason = String(item.reason || item.explanation || item.note || '').trim() || 'AI 建议';
  const suggestion: WorldbookSortSuggestion = {
    index: index,
    reason: reason,
  };

  if (item.suggestedPosition !== undefined || item.position !== undefined) {
    const parsedPosition = parseAIPositionSuggestion(item.suggestedPosition !== undefined ? item.suggestedPosition : item.position);
    if (parsedPosition !== undefined) {
      suggestion.suggestedPosition = parsedPosition;
    }
  }
  if (item.suggestedDepth !== undefined || item.depth !== undefined) {
    suggestion.suggestedDepth = Math.max(0, safeInt(item.suggestedDepth !== undefined ? item.suggestedDepth : item.depth, 4));
  }
  if (item.suggestedRole !== undefined || item.role !== undefined) {
    suggestion.suggestedRole = clamp(safeInt(item.suggestedRole !== undefined ? item.suggestedRole : item.role, 0), 0, 2) as 0 | 1 | 2;
  }
  if (item.suggestedOrder !== undefined || item.order !== undefined) {
    suggestion.suggestedOrder = Math.max(0, safeInt(item.suggestedOrder !== undefined ? item.suggestedOrder : item.order, 100));
  }
  if (item.suggestedProb !== undefined || item.prob !== undefined) {
    suggestion.suggestedProb = clamp(safeInt(item.suggestedProb !== undefined ? item.suggestedProb : item.prob, 100), 1, 100);
  }
  if (item.suggestedPriority !== undefined || item.priority !== undefined) {
    const priority = clamp(
      safeInt(item.suggestedPriority !== undefined ? item.suggestedPriority : item.priority, 100),
      1,
      100
    );
    suggestion.suggestedPriority = priority;
    suggestion.suggestedProb = priority;
  }
  if (strategy) {
    suggestion.suggestedStrategy = strategy;
  }

  return suggestion;
}

export function parseWorldbookSortSuggestions(text: string): WorldbookSortSuggestion[] {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return [];

  let payload: unknown;
  try {
    payload = JSON.parse(candidate);
  } catch (error) {
    return [];
  }

  let rawList: unknown[] = [];
  if (Array.isArray(payload)) {
    rawList = payload.slice();
  } else if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.suggestions)) {
      rawList = obj.suggestions.slice();
    } else if (Array.isArray(obj.data)) {
      rawList = obj.data.slice();
    } else {
      rawList = [obj];
    }
  }

  return rawList
    .map(function (item) { return normalizeSuggestion(item); })
    .filter(function (item): item is WorldbookSortSuggestion { return !!item; });
}

function setModalSection(refs: ModalStateRefs, state: 'config' | 'loading' | 'empty' | 'results' | 'error'): void {
  refs.configState.hidden = state !== 'config';
  refs.loadingState.hidden = state !== 'loading';
  refs.emptyState.hidden = state !== 'empty';
  refs.resultsState.hidden = state !== 'results';
  refs.errorState.hidden = state !== 'error';
  refs.applyBtn.hidden = state !== 'results';
  refs.analyzeBtn.hidden = state === 'loading';
}

function updateConfigState(refs: ModalStateRefs): void {
  const settings = loadAISettings();
  const issue = validateAISettings(settings);

  if (issue) {
    refs.statusEl.textContent = '未配置';
    refs.statusEl.className = 'wb-ai-status is-warning';
    refs.configMessage.innerHTML = '当前 AI 设置不可用：<strong>' + escapeHTML(issue) + '</strong>。先去核心设置完成 AI 接入，再回来分析。';
    refs.jumpSettingsBtn && (refs.jumpSettingsBtn.disabled = false);
    refs.analyzeBtn.disabled = false;
    setModalSection(refs, 'config');
    return;
  }

  refs.statusEl.textContent = '已就绪';
  refs.statusEl.className = 'wb-ai-status is-ready';
  refs.configMessage.innerHTML = '当前可用：<strong>' + escapeHTML(buildAISettingsSummary(settings)) + '</strong>。可以直接开始分析。';
  refs.jumpSettingsBtn && (refs.jumpSettingsBtn.disabled = false);
  refs.analyzeBtn.disabled = false;
}

function renderSuggestionList(refs: ModalStateRefs, entries: WorldbookEntry[], format: WorldbookAnalysisFormat): void {
  refs.listEl.innerHTML = '';

  const visibleCount = currentSuggestions.filter(function (suggestion) {
    return !!entries[suggestion.index];
  }).length;

  if (!visibleCount) {
    refs.countEl.textContent = '0 条建议';
    setModalSection(refs, 'empty');
    return;
  }

  refs.countEl.textContent = String(visibleCount) + ' 条建议';

  currentSuggestions.forEach(function (suggestion, suggestionIndex) {
    const entry = entries[suggestion.index];
    if (!entry) return;

    const currentStrategy = entry.strategy || 'selective';
    const currentPosition = safeInt(entry.position, 4);
    const currentDepth = safeInt(entry.depth, 4);
    const currentRole = safeInt(entry.role, 0);
    const currentOrder = safeInt(entry.order, 100);
    const currentProb = safeInt(entry.prob, 100);

    const suggestedStrategy = suggestion.suggestedStrategy || currentStrategy;
    const suggestedPosition = suggestion.suggestedPosition !== undefined ? suggestion.suggestedPosition : currentPosition;
    const suggestedDepth = suggestion.suggestedDepth !== undefined ? suggestion.suggestedDepth : currentDepth;
    const suggestedRole = suggestion.suggestedRole !== undefined ? suggestion.suggestedRole : currentRole;
    const suggestedOrder = suggestion.suggestedOrder !== undefined ? suggestion.suggestedOrder : currentOrder;
    const suggestedProb = suggestion.suggestedProb !== undefined ? suggestion.suggestedProb : currentProb;
    const probLabel = format === 'vanilla' ? 'priority' : 'prob';
    const showLegacyFields = format === 'sillytavern';

    const item = document.createElement('article');
    item.className = 'wb-ai-suggestion-item';
    item.innerHTML = [
      '<label class="wb-ai-suggestion-check">',
      '  <input type="checkbox" checked data-suggestion-index="' + String(suggestionIndex) + '" />',
      '  <span></span>',
      '</label>',
      '<div class="wb-ai-suggestion-body">',
      '  <div class="wb-ai-suggestion-top">',
      '    <div>',
      '      <h4 class="wb-ai-suggestion-title">#' + String(suggestion.index + 1) + ' · ' + escapeHTML(entry.comment || '未命名条目') + '</h4>',
      '      <p class="wb-ai-suggestion-meta">关键词：' + escapeHTML(normalizeArrayText(entry.keys) || '无') + '</p>',
      '    </div>',
      '    <span class="wb-ai-suggestion-badge">建议 #' + String(suggestionIndex + 1) + '</span>',
      '  </div>',
      '  <div class="wb-ai-suggestion-grid">',
      '    <div class="wb-ai-suggestion-col">',
      '      <div class="wb-ai-suggestion-label">当前</div>',
      '      <div class="wb-ai-suggestion-summary">',
      '        <div>strategy: ' + escapeHTML(formatStrategyLabel(currentStrategy, format)) + '</div>',
      '        <div>position: ' + escapeHTML(formatPositionLabel(currentPosition, format)) + '</div>',
      showLegacyFields ? '        <div>depth: ' + String(currentDepth) + '</div>' : '',
      showLegacyFields ? '        <div>role: ' + String(currentRole) + '</div>' : '',
      '        <div>order: ' + String(currentOrder) + '</div>',
      '        <div>' + probLabel + ': ' + String(currentProb) + '</div>',
      '      </div>',
      '    </div>',
      '    <div class="wb-ai-suggestion-col is-suggested">',
      '      <div class="wb-ai-suggestion-label">建议</div>',
      '      <div class="wb-ai-suggestion-summary">',
      '        <div>strategy: ' + escapeHTML(formatStrategyLabel(suggestedStrategy, format)) + '</div>',
      '        <div>position: ' + escapeHTML(formatPositionLabel(suggestedPosition, format)) + '</div>',
      showLegacyFields ? '        <div>depth: ' + String(suggestedDepth) + '</div>' : '',
      showLegacyFields ? '        <div>role: ' + String(suggestedRole) + '</div>' : '',
      '        <div>order: ' + String(suggestedOrder) + '</div>',
      '        <div>' + probLabel + ': ' + String(suggestedProb) + '</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="wb-ai-suggestion-content">',
      '    <div class="wb-ai-suggestion-content-title">建议原因</div>',
      '    <p>' + escapeHTML(String((suggestion.reason || 'AI 建议') + '')) + '</p>',
      '    <div class="wb-ai-suggestion-content-title">内容摘要</div>',
      '    <pre>' + escapeHTML(String(entry.content || '').trim().slice(0, 220) || '（空内容）') + '</pre>',
      '  </div>',
      '</div>',
    ].join('');
    refs.listEl.appendChild(item);
  });

  refs.selectAll && (refs.selectAll.checked = true);
  setModalSection(refs, 'results');

  if (refs.selectAll) {
    refs.selectAll.onchange = function () {
      const checked = refs.selectAll!.checked;
      refs.listEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(function (cb) {
        cb.checked = checked;
      });
    };
  }
}

async function runAnalysis(refs: ModalStateRefs, options: WorldbookAISortOptions): Promise<void> {
  const entries = options.getEntries();
  if (!entries.length) {
    refs.countEl.textContent = '0 条建议';
    refs.configMessage.textContent = '当前还没有世界书条目，先添加一些条目再来分析。';
    setModalSection(refs, 'config');
    return;
  }

  const settings = loadAISettings();
  const issue = validateAISettings(settings);
  if (issue) {
    refs.configMessage.innerHTML = '当前 AI 设置不可用：<strong>' + escapeHTML(issue) + '</strong>。';
    setModalSection(refs, 'config');
    return;
  }

  currentSuggestions = [];
  refs.errorMessage.textContent = '';
  setModalSection(refs, 'loading');

  try {
    const format = getAnalysisFormat(refs);
    const prompt = buildWorldbookSortPrompt(entries, options.getWorldbookName ? options.getWorldbookName() : '', format);
    const response = await callAIText(prompt, settings, {
      temperature: 0.2,
      maxTokens: 2048,
    });
    currentSuggestions = parseWorldbookSortSuggestions(response);

    if (!currentSuggestions.length) {
      refs.emptyState.innerHTML = [
        '<div class="wb-ai-empty-copy">',
        '  <h4>没有解析到有效建议</h4>',
        '  <p>AI 返回了内容，但没有形成可用的 JSON 数组。可以再试一次，或微调模型设置。</p>',
        '</div>',
      ].join('');
      setModalSection(refs, 'empty');
      return;
    }

    renderSuggestionList(refs, entries, format);
  } catch (error) {
    refs.errorMessage.textContent = '分析失败：' + String(error instanceof Error ? error.message : error);
    setModalSection(refs, 'error');
  }
}

function applySuggestions(refs: ModalStateRefs, options: WorldbookAISortOptions): number {
  const entries = options.getEntries();
  const isVanilla = getAnalysisFormat(refs) === 'vanilla';
  const checked = Array.prototype.slice.call(refs.listEl.querySelectorAll('input[type="checkbox"]:checked')) as HTMLInputElement[];
  let applied = 0;

  checked.forEach(function (cb) {
    const suggestionIndex = safeInt(cb.getAttribute('data-suggestion-index'), -1);
    const suggestion = currentSuggestions[suggestionIndex];
    if (!suggestion) return;

    const entry = entries[suggestion.index];
    if (!entry) return;

    if (suggestion.suggestedStrategy) {
      entry.strategy = isVanilla && suggestion.suggestedStrategy === 'vectorized'
        ? 'selective'
        : suggestion.suggestedStrategy;
    }
    if (suggestion.suggestedPosition !== undefined) {
      entry.position = clamp(suggestion.suggestedPosition, 0, 6);
    }
    if (!isVanilla && suggestion.suggestedDepth !== undefined) {
      entry.depth = Math.max(0, suggestion.suggestedDepth);
    }
    if (!isVanilla && suggestion.suggestedRole !== undefined) {
      entry.role = clamp(suggestion.suggestedRole, 0, 2) as 0 | 1 | 2;
    }
    if (suggestion.suggestedOrder !== undefined) {
      entry.order = Math.max(0, suggestion.suggestedOrder);
    }
    if (suggestion.suggestedProb !== undefined) {
      entry.prob = clamp(suggestion.suggestedProb, 1, 100);
    }
    if (isVanilla && suggestion.suggestedPriority !== undefined) {
      entry.prob = clamp(suggestion.suggestedPriority, 1, 100);
    }

    applied++;
  });

  if (!applied) {
    alert('没有可应用的建议');
    return 0;
  }

  options.commit();
  return applied;
}

/** 初始化世界书 AI 排序模态 */
export function initWorldbookAISort(options: WorldbookAISortOptions): void {
  const modal = document.getElementById('wbAiSortModal');
  const analyzeBtn = document.getElementById('wbAiSortAnalyze');
  const applyBtn = document.getElementById('wbAiSortApply');
  const cancelBtn = document.getElementById('wbAiSortCancel');
  const closeBtn = document.getElementById('wbAiSortClose');
  const jumpSettingsBtn = document.getElementById('wbAiSortJumpSettings');
  const formatSelect = document.getElementById('wbAiSortFormat') as HTMLSelectElement | null;
  const selectAll = document.getElementById('wbAiSortSelectAll') as HTMLInputElement | null;
  const loadingState = document.getElementById('wbAiSortLoading');
  const emptyState = document.getElementById('wbAiSortEmpty');
  const configState = document.getElementById('wbAiSortConfig');
  const errorState = document.getElementById('wbAiSortError');
  const resultsState = document.getElementById('wbAiSortResults');
  const configMessage = document.getElementById('wbAiSortConfigMessage');
  const errorMessage = document.getElementById('wbAiSortErrorMessage');
  const listEl = document.getElementById('wbAiSortList');
  const countEl = document.getElementById('wbAiSortCount');
  const statusEl = document.getElementById('wbAiSortStatus');

  if (
    !modal ||
    !analyzeBtn ||
    !applyBtn ||
    !cancelBtn ||
    !loadingState ||
    !emptyState ||
    !configState ||
    !errorState ||
    !resultsState ||
    !configMessage ||
    !errorMessage ||
    !listEl ||
    !countEl ||
    !statusEl
  ) {
    return;
  }

  const refs: ModalStateRefs = {
    modal: modal,
    analyzeBtn: analyzeBtn as HTMLButtonElement,
    applyBtn: applyBtn as HTMLButtonElement,
    cancelBtn: cancelBtn as HTMLButtonElement,
    closeBtn: closeBtn as HTMLButtonElement | null,
    jumpSettingsBtn: jumpSettingsBtn as HTMLButtonElement | null,
    formatSelect: formatSelect,
    selectAll: selectAll,
    loadingState: loadingState,
    emptyState: emptyState,
    configState: configState,
    errorState: errorState,
    resultsState: resultsState,
    configMessage: configMessage,
    errorMessage: errorMessage,
    listEl: listEl,
    countEl: countEl,
    statusEl: statusEl,
  };

  if (refs.formatSelect) {
    refs.formatSelect.value = window.__cardFormat__ === 'vanilla' ? 'vanilla' : 'sillytavern';
  }

  function openModal(): void {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    currentSuggestions = [];
    refs.listEl.innerHTML = '';
    refs.countEl.textContent = '0 条建议';
    refs.applyBtn.hidden = true;
    refs.analyzeBtn.hidden = false;
    updateConfigState(refs);
    refs.analyzeBtn.focus();
  }

  function closeModal(): void {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  function bindJumpSettings(): void {
    if (!refs.jumpSettingsBtn) return;
    refs.jumpSettingsBtn.onclick = function () {
      if (options.openSettings) {
        options.openSettings();
      }
      closeModal();
    };
  }

  (document.getElementById('btnOpenWorldbookAISort') as HTMLButtonElement | null)?.addEventListener('click', openModal);
  refs.cancelBtn.addEventListener('click', closeModal);
  refs.closeBtn && refs.closeBtn.addEventListener('click', closeModal);
  refs.modal.addEventListener('click', function (event) {
    if (event.target === refs.modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (refs.modal.hidden) return;
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  bindJumpSettings();

  refs.analyzeBtn.addEventListener('click', function () {
    refs.analyzeBtn.disabled = true;
    runAnalysis(refs, options).finally(function () {
      refs.analyzeBtn.disabled = false;
      if (!refs.resultsState.hidden) {
        refs.applyBtn.hidden = false;
      }
    });
  });

  refs.applyBtn.addEventListener('click', function () {
    const applied = applySuggestions(refs, options);
    if (!applied) return;
    closeModal();
    setTimeout(function () {
      alert('已应用 ' + String(applied) + ' 条 AI 排序建议');
    }, 0);
  });

  updateConfigState(refs);
}

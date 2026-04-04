/**
 * Status bar panel management.
 *
 * Uses nanostores `statusBarData` atom from card-store as the single source of
 * truth.  Exposes `window.__getStatusBarData__` and `window.__loadStatusBarData__`
 * on the bridge layer for backward compatibility.
 */
import { statusBarData, triggerGlobalUpdate } from '../stores/card-store';

export function initStatusBar(): void {
  var sbDescription = document.getElementById('sbDescription') as HTMLTextAreaElement | null;
  var sbPresetStatusBlock = document.getElementById('sbPresetStatusBlock') as HTMLTextAreaElement | null;

  function updateStatePreview() {
    if (!sbPresetStatusBlock) return;
    sbPresetStatusBlock.value = String(sbPresetStatusBlock.value || '');
  }

  function syncToStore() {
    statusBarData.set({
      description: sbDescription ? sbDescription.value : '',
      presetStatusBlock: sbPresetStatusBlock ? sbPresetStatusBlock.value : '',
    });
  }

  function loadState(data: { description?: string; presetStatusBlock?: string; title?: string } | null) {
    if (!data) {
      sbDescription!.value = '📅 寒假第{X}天 · 📍 {地点}\n\n🧩 角色状态设定：';
      sbPresetStatusBlock!.value = '📅 寒假第1天 · 📍 酒店1207房间\n\n填写首条状态块内容';
      syncToStore();
      updateStatePreview();
      return;
    }
    if (data.description !== undefined) sbDescription!.value = data.description;
    if (data.presetStatusBlock !== undefined) sbPresetStatusBlock!.value = data.presetStatusBlock;
    if (data.title !== undefined && data.presetStatusBlock === undefined) sbPresetStatusBlock!.value = data.title;
    syncToStore();
    updateStatePreview();
  }

  if (sbDescription) {
    sbDescription.addEventListener('input', function() {
      syncToStore();
      updateStatePreview();
    });
  }

  // Keep window bridge for backward compatibility
  (window as any).__getStatusBarData__ = function () {
    return statusBarData.get() || { description: '', presetStatusBlock: '' };
  };
  (window as any).__loadStatusBarData__ = loadState;

  if (typeof (window as any).renderFieldList === 'function') {
    (window as any).renderFieldList();
  }
  updateStatePreview();
  syncToStore();
}

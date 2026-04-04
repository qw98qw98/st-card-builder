import type { WorldbookEntry } from '../types/worldbook';

// ============================================================
//  世界书辅助函数 — 纯函数，无 DOM 依赖
// ============================================================

/** 获取世界书来源显示标签 */
export function getWorldbookSourceLabel(source: string | undefined): string {
  if (source === 'ai') return '生成';
  if (source === 'import') return '导入';
  return '手动';
}

/** 获取世界书来源 CSS 类名 */
export function getWorldbookSourceClass(source: string | undefined): string {
  if (source === 'ai') return 'wb-source-generated';
  if (source === 'import') return 'wb-source-import';
  return 'wb-source-manual';
}

/** 清理世界书条目标题（去掉前后的 = 装饰） */
export function cleanWorldbookTitle(comment: string | undefined, index: number): string {
  let title = String(comment || '').trim();
  title = title.replace(/^=+\s*/g, '').replace(/\s*=+$/g, '').trim();
  return title || ('未命名条目 ' + String(index + 1));
}

/** 标准化世界书文本块（统一换行符 + trim） */
export function normalizeWorldbookTextBlock(text: string | undefined): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/** 生成世界书条目的纯文本复制内容 */
export function makePreviewCopyText(entry: WorldbookEntry | null | undefined): string {
  entry = entry || {};
  const title = entry.comment || '未命名';
  const keys = (entry.keys || []).join(', ') || '无';
  const content = entry.content || '';
  return [
    '标题：' + title,
    '来源：' + getWorldbookSourceLabel(entry.source || 'manual'),
    '触发词：' + keys,
    '策略：' + (entry.strategy || 'selective'),
    '位置：' + String(entry.position !== undefined ? entry.position : 4),
    '深度：' + String(entry.depth !== undefined ? entry.depth : 4),
    '顺序：' + String(entry.order !== undefined ? entry.order : 100),
    '概率：' + String(entry.prob !== undefined ? entry.prob : 100) + '%',
    '',
    '设定内容：',
    content
  ].join('\n');
}

/** 将世界书条目导出为 Markdown 文本 */
export function buildWorldbookMarkdown(entries: WorldbookEntry[]): string {
  const list = Array.isArray(entries) ? entries : [];
  const lines: string[] = [];
  lines.push('世界书词条导出');
  lines.push('');
  lines.push('共 ' + String(list.length) + ' 条');
  lines.push('');
  list.forEach(function(entry, index) {
    const title = cleanWorldbookTitle(entry && entry.comment, index);
    const keys = Array.isArray(entry && entry.keys) ? entry.keys!.filter(function(key) {
      return String(key || '').trim().length > 0;
    }) : [];
    const content = normalizeWorldbookTextBlock(entry && entry.content);
    lines.push('条目 ' + String(index + 1));
    lines.push('标题：' + title);
    lines.push('触发词：' + (keys.length ? keys.join('，') : '无'));
    lines.push('设定内容：');
    lines.push(content || '（空）');
    lines.push('');
  });
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}

/** 下载世界书 Markdown 文件 */
export function downloadWorldbookMarkdown(nameSource: string, entries: WorldbookEntry[]): void {
  const markdown = buildWorldbookMarkdown(entries);
  const fileName = nameSource.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'worldbook';
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName + '.md';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

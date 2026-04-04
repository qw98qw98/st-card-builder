/**
 * Alternate greetings management.
 *
 * Uses nanostores `altGreetings` atom from card-store as the single source of
 * truth.  Exposes `window.__renderAltGreetings__` for backward compatibility.
 */
import { altGreetings, triggerGlobalUpdate } from '../stores/card-store';

export function initAltGreetings(): void {
  var btnAdd = document.getElementById('btnAddGreeting');
  var listEl = document.getElementById('altGreetingsList');
  if (!btnAdd || !listEl) return;

  function escapeHTML(str: string): string {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(): void {
    var greetings = altGreetings.get();
    if (!greetings.length) {
      listEl!.innerHTML = '<div class="alt-greetings-empty">暂无备选开场白，点击右上角 ＋ 添加</div>';
      return;
    }
    listEl!.innerHTML = '';
    greetings.forEach(function (text, i) {
      var item = document.createElement('div');
      item.className = 'alt-greeting-item';
      item.innerHTML =
        '<div class="alt-greeting-bar">' +
          '<span class="alt-greeting-label">开场白 #' + (i + 2) + '</span>' +
          '<div class="alt-greeting-actions">' +
            (i > 0
              ? '<button class="btn-alt-action" data-action="up" data-idx="' + i + '" title="上移">↑</button>'
              : '') +
            (i < greetings.length - 1
              ? '<button class="btn-alt-action" data-action="down" data-idx="' + i + '" title="下移">↓</button>'
              : '') +
            '<button class="btn-alt-action btn-alt-del" data-action="del" data-idx="' + i + '" title="删除">✕</button>' +
          '</div>' +
        '</div>' +
        '<textarea class="alt-greeting-ta" data-idx="' + i + '" placeholder="备选开场白 #' + (i + 2) + ' 的内容...">' +
          escapeHTML(text) +
        '</textarea>';
      listEl!.appendChild(item);
    });

    listEl!.querySelectorAll('.alt-greeting-ta').forEach(function (ta: Element) {
      ta.addEventListener('input', function (e: Event) {
        var idx = parseInt((e.target as HTMLElement).getAttribute('data-idx') || '0');
        var arr = altGreetings.get().slice();
        arr[idx] = (e.target as HTMLTextAreaElement).value;
        altGreetings.set(arr);
        notifyChange();
      });
    });
    listEl!.querySelectorAll('.btn-alt-action').forEach(function (btn: Element) {
      btn.addEventListener('click', function (e: Event) {
        var action = (e.currentTarget as HTMLElement).getAttribute('data-action');
        var idx    = parseInt((e.currentTarget as HTMLElement).getAttribute('data-idx') || '0');
        var g = altGreetings.get().slice();
        if (action === 'del') {
          g.splice(idx, 1);
        } else if (action === 'up' && idx > 0) {
          var tmp = g[idx]; g[idx] = g[idx - 1]; g[idx - 1] = tmp;
        } else if (action === 'down' && idx < g.length - 1) {
          var tmp2 = g[idx]; g[idx] = g[idx + 1]; g[idx + 1] = tmp2;
        }
        altGreetings.set(g);
        render();
        notifyChange();
      });
    });
  }

  btnAdd.addEventListener('click', function () {
    altGreetings.set(altGreetings.get().concat(['']));
    render();
    var tas = listEl!.querySelectorAll('.alt-greeting-ta');
    if (tas.length) (tas[tas.length - 1] as HTMLElement).focus();
    notifyChange();
  });

  function notifyChange() {
    triggerGlobalUpdate();
  }

  // Keep for backward compatibility but also expose render
  (window as any).__renderAltGreetings__ = render;
  render();
}

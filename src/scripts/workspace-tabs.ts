/**
 * Workspace tab switching with localStorage persistence.
 *
 * Queries `[data-workspace-section]` and `[data-workspace-target]` elements,
 * sets up tab click handlers, and restores the previously selected tab on load.
 */
export function initWorkspaceTabs(): void {
  var STORAGE_KEY = 'st_v3_workspace_tab';
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-workspace-section]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-workspace-target]'));

  function activate(name: string, skipStore?: boolean) {
    sections.forEach(function (section: HTMLElement) {
      var active = section.getAttribute('data-workspace-section') === name;
      section.hidden = !active;
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    tabs.forEach(function (tab: HTMLElement) {
      var active = tab.getAttribute('data-workspace-target') === name;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (!skipStore) {
      try { localStorage.setItem(STORAGE_KEY, name); } catch (err) {}
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  (window as any).__setWorkspaceTab__ = activate;

  var initial = 'core';
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && document.querySelector('[data-workspace-section="' + saved + '"]')) {
      initial = saved;
    }
  } catch (err) {}

  tabs.forEach(function (tab: HTMLElement) {
    tab.addEventListener('click', function () {
      activate(tab.getAttribute('data-workspace-target') || '');
    });
  });

  activate(initial, true);
}

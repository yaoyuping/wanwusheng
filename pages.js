/* Dedicated archive, plant and encyclopedia pages with browser navigation. */
(() => {
  'use strict';
  const listTabs = new Set(['home', 'plants', 'atlas', 'recognize', 'care', 'settings']);
  const viewKeys = ['search', 'filter', 'atlasSearch', 'atlasFilter', 'logFilter', 'selectedDay', 'calendarMonth'];
  const baseRender = render;
  let current = null, initialized = false, painting = false, renderedHash = '', scrollTimer;
  history.scrollRestoration = 'manual';

  const parentTab = route => route.kind === 'plant' ? 'plants' : 'atlas';
  const hashFor = route => route.kind === 'plant'
    ? `#plants/${encodeURIComponent(route.id)}/${route.tab || 'info'}`
    : `#atlas/${encodeURIComponent(route.id)}${route.kind === 'guide' ? '/encyclopedia' : ''}`;
  function parse() {
    let parts;
    try { parts = location.hash.slice(1).split('/').map(decodeURIComponent); } catch { return { tab: 'home' }; }
    const [tab, id, section] = parts;
    if (parts.length <= 3 && id && tab === 'plants' && (!section || ['info', 'logs', 'photos'].includes(section))) return { kind: 'plant', id, tab: section || 'info' };
    if (parts.length <= 3 && id && tab === 'atlas' && (!section || section === 'encyclopedia')) return { kind: section ? 'guide' : 'record', id };
    return { tab: listTabs.has(tab) ? tab : 'home' };
  }
  function exists(route) {
    return (route.kind === 'plant' ? state.plants : state.sightings).some(item => item.id === route.id);
  }
  function snapshot() {
    const view = Object.fromEntries(viewKeys.filter(key => ui[key] !== undefined).map(key => [key, ui[key]]));
    history.replaceState({ ...history.state, yiyuPage: { ...history.state?.yiyuPage, view, scroll: scrollY } }, '', location.href);
  }
  function write(hash, replace = false) {
    const previous = replace ? history.state?.yiyuPage?.previous : location.hash;
    history[replace ? 'replaceState' : 'pushState']({ yiyuPage: { previous, scroll: 0 } }, '', hash);
    renderedHash = location.hash;
  }
  function mode(enabled) {
    document.body.classList.toggle('detail-page-open', enabled);
    if (!enabled) document.title = '万物生 · 植物篇';
  }
  function list(tab, replace = false) {
    snapshot(); closeModal(); current = null;
    ui.tab = listTabs.has(tab) ? tab : 'home'; ui.search = ''; ui.atlasSearch = '';
    write('#' + ui.tab, replace); mode(false); render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function back() {
    if (typeof history.state?.yiyuPage?.previous === 'string') { snapshot(); history.back(); return; }
    if (current?.kind === 'guide') { write(hashFor({ kind: 'record', id: current.id }), true); restore(); }
    else list(current ? parentTab(current) : ui.tab, true);
  }
  function show(route, title, body) {
    const same = current?.kind === route.kind && current?.id === route.id;
    const top = same ? scrollY : 0;
    if (!painting) {
      snapshot();
      current = route; ui.tab = parentTab(route);
      write(hashFor(route), same);
      // Run the normal cleanup paths, including disposing the overview map.
      baseRender();
    }
    current = route; closeModal(); mode(true);
    const label = route.kind === 'plant' ? '我的植物' : route.kind === 'record' ? '发现档案' : '植物百科';
    const backLabel = route.kind === 'guide' ? '返回发现档案' : '返回';
    document.getElementById('app').innerHTML = `<article class="detail-page detail-page-${route.kind}"><header class="detail-page-header"><button type="button" class="detail-page-back" data-action="page-back" aria-label="${backLabel}">${ico('back', 21)}<span>${backLabel}</span></button><h1>${label}</h1><span class="detail-page-header-spacer" aria-hidden="true"></span></header>${body}</article>`;
    document.title = title + ' · 万物生';
    renderedHash = location.hash;
    if (!painting) {
      window.scrollTo({ top, behavior: 'instant' });
      document.getElementById('app').focus({ preventScroll: true });
    }
  }
  function paint() {
    painting = true;
    try {
      if (current.kind === 'plant') plantDetail(current.id, current.tab);
      else if (current.kind === 'record') sightingDetail(current.id);
      else void window.yiyuRenderGuide(current.id);
    } finally { painting = false; }
  }
  function restore() {
    if (!state) return;
    closeModal(); const route = parse(), entry = history.state?.yiyuPage;
    if (entry?.view) Object.assign(ui, entry.view);
    current = route.kind ? route : null; ui.tab = current ? parentTab(current) : route.tab;
    renderedHash = location.hash; render();
    window.scrollTo({ top: entry?.scroll || 0, behavior: 'instant' });
    document.getElementById('app').focus({ preventScroll: true });
  }
  render = function() {
    if (!state) return baseRender();
    const top = initialized ? scrollY : history.state?.yiyuPage?.scroll || 0;
    if (!initialized) {
      initialized = true;
      const route = parse(); current = route.kind ? route : null;
      ui.tab = current ? parentTab(current) : route.tab;
      if (history.state?.yiyuPage?.view) Object.assign(ui, history.state.yiyuPage.view);
    }
    // Older actions can switch tabs directly; keep those actions compatible.
    if (current && ui.tab !== parentTab(current)) { current = null; write('#' + ui.tab, true); }
    if (current && !exists(current)) {
      const tab = parentTab(current); current = null; ui.tab = tab; write('#' + tab, true);
      toast('这份档案已删除，已返回列表');
    }
    mode(Boolean(current)); baseRender();
    if (current) { paint(); window.scrollTo({ top, behavior: 'instant' }); }
    renderedHash = location.hash;
  };
  go = tab => list(tab);
  const baseAct = act;
  act = async function(action, element) {
    if (action === 'page-back' || (action === 'v56-back-record' && current?.kind === 'guide')) return back();
    return baseAct(action, element);
  };
  const onHistory = () => { if (location.hash !== renderedHash) restore(); };
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);
  window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(snapshot, 120); }, { passive: true });
  window.addEventListener('pagehide', snapshot);
  window.yiyuPages = { show, get active() { return current; } };
  if (state) render();
})();

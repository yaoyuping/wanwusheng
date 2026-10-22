/* 万物生 v5.6 · 同种发现归档、自动足迹地图与独立植物百科。 */
function sightingPhotos(record) {
  return (Array.isArray(record?.images) ? record.images : [record?.image || record?.photo]).filter(value => typeof value === 'string' && imageSrc(value));
}

(() => {
  'use strict';
  const atlasMapId = 'v56-atlas-map', recordMapId = 'v56-record-map';
  const encyclopedia = window.yiyuEncyclopedia;
  const maps = new Map();
  const searchStates = new WeakMap();
  const searchMarkers = new WeakMap();
  const pickerMapId = 'v58-picker-map';
  const pendingGuides = new Map();
  const observationMarker = '【AI 植物百科草稿】';

  function coordinate(sighting) {
    if (sighting.lat === '' || sighting.lon === '' || sighting.lat == null || sighting.lon == null) return null;
    const lat = Number(sighting.lat), lon = Number(sighting.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
  }

  function groups() {
    const result = [];
    for (const sighting of [...state.sightings].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))) {
      const latin = String(sighting.latin || '').trim().toLowerCase(), name = String(sighting.name || '').trim().toLowerCase();
      let group = result.find(item => item.records.some(record => {
        const otherLatin = String(record.latin || '').trim().toLowerCase();
        return latin && otherLatin ? latin === otherLatin : name && String(record.name || '').trim().toLowerCase() === name;
      }));
      if (!group) { group = { records: [] }; result.push(group); }
      group.records.push(sighting);
    }
    return result.map(group => ({ ...group, first: group.records[0], latin: group.records.find(record => record.latin)?.latin || '' }));
  }

  function groupFor(id) { return groups().find(group => group.records.some(record => record.id === id)); }
  function places(records) {
    const found = new Map();
    for (const record of records) {
      const name = String(record.location || '').trim() || '未记录地点';
      const item = found.get(name) || { name, count: 0, first: '', latest: '' };
      item.count++;
      if (record.date && (!item.first || record.date < item.first)) item.first = record.date;
      if (record.date && (!item.latest || record.date > item.latest)) item.latest = record.date;
      found.set(name, item);
    }
    return [...found.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  }

  function observation(notes) {
    return String(notes || '').split(observationMarker)[0].trim();
  }

  function mapSection(records, id, title) {
    const located = records.filter(record => coordinate(record));
    return `<section class="v56-map-section" aria-label="${esc(title)}"><div class="v56-section-title"><h3>${esc(title)}</h3><span>${located.length} 个有坐标的记录</span></div>${searchBox(id)}<div class="v56-map" id="${id}" role="region" aria-label="${esc(title)}地图"></div>${located.length ? '' : '<p class="v56-map-empty">还没有带坐标的发现记录。搜索地点后，可在地图上添加一次发现。</p>'}<p class="v56-map-credit">地图数据 © OpenStreetMap contributors · 搜索地点后可选择位置并记录发现。</p></section>`;
  }

  function searchBox(mapId) {
    return `<div class="v58-place-search" data-map="${mapId}"><label for="${mapId}-query">搜索地点</label><div class="v58-search-line"><input type="search" id="${mapId}-query" class="v58-place-query" maxlength="180" placeholder="输入城市、公园或地址，如：杭州植物园" autocomplete="off"><button type="button" class="outlined-btn" data-action="v58-search-place">搜索地点</button></div><p class="v58-search-state" role="status" aria-live="polite"></p><div class="v58-search-results"></div></div>`;
  }

  function destroyMap(id) {
    const map = maps.get(id);
    if (map) { map.remove(); maps.delete(id); }
  }

  function mountMap(id, records) {
    destroyMap(id);
    const container = document.getElementById(id), located = records.filter(record => coordinate(record));
    if (!container) return;
    if (!window.L) { container.textContent = '地图暂时不可用；下方的地点记录仍可查看。'; return; }
    const map = L.map(container, { scrollWheelZoom: false, zoomControl: true });
    maps.set(id, map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const pins = new Map();
    for (const record of located) {
      const position = coordinate(record), key = position.map(value => value.toFixed(4)).join(',');
      if (!pins.has(key)) pins.set(key, { position, records: [] });
      pins.get(key).records.push(record);
    }
    for (const item of pins.values()) {
      const count = item.records.length;
      const icon = L.divIcon({ className: 'v56-pin', html: `<span><b>${count}</b></span>`, iconSize: [35, 35], iconAnchor: [17, 35] });
      const rows = item.records.slice(0, 8).map(record => `<div><b>${esc(record.name || '待确认植物')}</b> · ${esc(record.location || '未记录地点')}<small>${esc(record.date || '日期未记录')}</small></div>`).join('');
      L.marker(item.position, { icon }).addTo(map).bindPopup(`<div class="v56-map-popup">${rows}${count > 8 ? `<small>另有 ${count - 8} 条记录</small>` : ''}</div>`);
    }
    const bounds = located.map(record => coordinate(record));
    if (!bounds.length) map.setView([35, 105], 4);
    else if (bounds.length === 1) map.setView(bounds[0], 13);
    else map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    setTimeout(() => { if (container.isConnected && maps.get(id) === map) map.invalidateSize(); }, 80);
  }

  function selectedPoint(scope, point) {
    const form = scope.closest('#sighting-form'), map = maps.get(scope.dataset.map);
    if (form) {
      form.querySelector('[name=location]').value = point.name;
      form.querySelector('[name=lat]').value = String(point.lat);
      form.querySelector('[name=lon]').value = String(point.lon);
      form.querySelector('#v2-coord-state').textContent = `已选择：${point.name} · ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}（保存后加入足迹）`;
    }
    if (map) {
      const old = searchMarkers.get(map); if (old) old.remove();
      const marker = L.marker([point.lat, point.lon]).addTo(map);
      searchMarkers.set(map, marker);
      map.setView([point.lat, point.lon], 16);
      if (!form) {
        const record = scope.dataset.map === recordMapId ? document.querySelector('.v56-record-actions [data-action="v56-add-record"]')?.dataset.id : '';
        marker.bindPopup(`<div class="v58-map-choice"><b>${esc(point.name)}</b><button type="button" class="outlined-btn" data-action="v58-record-place" data-id="${esc(record || '')}" data-name="${esc(point.name)}" data-lat="${point.lat}" data-lon="${point.lon}">在这里添加记录</button></div>`).openPopup();
      }
    }
    scope.querySelector('.v58-search-state').textContent = form ? '地点与坐标已填入，可在地图上点选微调，再保存发现。' : '地图已移动到所选地点，可点击标记添加记录。';
    scope.querySelector('.v58-search-results').replaceChildren();
  }

  async function searchPlace(scope) {
    const input = scope.querySelector('.v58-place-query'), query = input.value.trim();
    const status = scope.querySelector('.v58-search-state'), results = scope.querySelector('.v58-search-results');
    if (scope.querySelector('[data-action="v2-geolocate"]')?.disabled) { status.textContent = '手机正在定位，请等待定位完成后再搜索地点。'; return; }
    if (query.length < 2) { status.textContent = '请输入至少 2 个字的地点名称，例如“杭州植物园”。'; return; }
    searchStates.get(scope)?.controller?.abort();
    const controller = new AbortController(), state = { controller, results: [] };
    searchStates.set(scope, state);
    const button = scope.querySelector('[data-action="v58-search-place"]'); button.disabled = true;
    status.textContent = '正在搜索地点…'; results.replaceChildren();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(yiyuAPILink('/api/places?q=' + encodeURIComponent(query)), { headers: { 'X-Yiyu-Password': yiyuPassword() }, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || '地点搜索失败，请稍后重试。');
      if (!Array.isArray(data.results)) throw Error('地点搜索未返回有效结果，请重试。');
      if (!scope.isConnected || searchStates.get(scope) !== state) return;
      state.results = data.results.filter(result => coordinate(result) && typeof result.name === 'string');
      status.textContent = state.results.length ? `找到 ${state.results.length} 个地点，请选择；同名地点请核对地址。` : '未找到地点，请补充城市名后重试，例如“杭州市植物园”；也可以在地图上点选。';
      results.innerHTML = state.results.map((point, index) => `<button type="button" class="v58-place-result" data-action="v58-select-place" data-index="${index}"><strong>${esc(point.name)}</strong><small>${esc(point.address || '')}</small></button>`).join('');
    } catch (error) {
      if (scope.isConnected && searchStates.get(scope) === state) status.textContent = error.name === 'AbortError' ? '搜索超时，请重试；也可以在地图上点选位置。' : error.message;
    } finally {
      clearTimeout(timeout);
      if (scope.isConnected && searchStates.get(scope) === state) button.disabled = false;
    }
  }

  const oldForm = sightingForm;
  sightingForm = function(id = null, prefill = {}) {
    destroyMap(pickerMapId);
    oldForm(id, prefill);
    const form = document.getElementById('sighting-form'); if (!form) return;
    const field = form.querySelector('[name=location]').closest('.field');
    const scope = document.createElement('div'); scope.className = 'v58-place-search'; scope.dataset.map = pickerMapId;
    scope.innerHTML = '<p class="v58-search-state" role="status" aria-live="polite"></p><div class="v58-search-results"></div>';
    const row = field.querySelector('.v2-location-line');
    scope.prepend(row); field.querySelector('label').after(scope);
    const input = row.querySelector('[name=location]'); input.classList.add('v58-place-query'); input.maxLength = 180;
    input.placeholder = '输入城市、公园或地址，再点“搜索地点”';
    row.insertAdjacentHTML('beforeend', '<button type="button" class="outlined-btn" data-action="v58-search-place">搜索地点</button>');
    field.querySelector('.v4-location-map').textContent = '搜索并选中地点，或在地图上点选；坐标随这次观察保存在本机。';
    const coordStatus = form.querySelector('#v2-coord-state'); coordStatus.setAttribute('role', 'status');
    coordStatus.textContent = coordinate(Object.fromEntries(new FormData(form))) ? coordStatus.textContent : '可搜索地点、在地图上点选，或使用手机定位。';
    field.insertAdjacentHTML('beforeend', `<div class="v56-map v58-picker-map" id="${pickerMapId}" role="region" aria-label="选择发现地点地图"></div>`);
    const point = coordinate(Object.fromEntries(new FormData(form)));
    mountMap(pickerMapId, []);
    const map = maps.get(pickerMapId);
    if (map) {
      if (point) selectedPoint(scope, { name: input.value || '已记录地点', lat: point[0], lon: point[1] });
      map.on('click', event => {
        if (scope.querySelector('[data-action="v2-geolocate"]')?.disabled) return;
        selectedPoint(scope, { name: input.value.trim() || '地图自选地点', lat: event.latlng.lat, lon: event.latlng.lng });
      });
    }
    input.addEventListener('input', () => {
      searchStates.get(scope)?.controller?.abort(); searchStates.delete(scope);
      scope.querySelector('[data-action="v58-search-place"]').disabled = false;
      scope.querySelector('.v58-search-results').replaceChildren();
      form.querySelector('[name=lat]').value = ''; form.querySelector('[name=lon]').value = '';
      if (map) { searchMarkers.get(map)?.remove(); searchMarkers.delete(map); }
      coordStatus.textContent = '地点文字已修改，请搜索并选择地点，或在地图上点选以保存新坐标。';
      scope.querySelector('.v58-search-state').textContent = '';
    });
  };

  const oldLocation = v2getLocation;
  v2getLocation = async function() {
    const form = document.getElementById('sighting-form');
    const input = form?.querySelector('[name=location]');
    if (input) input.readOnly = true;
    try { await oldLocation(); } finally { if (input) input.readOnly = false; }
    if (!form?.isConnected) return;
    const point = coordinate(Object.fromEntries(new FormData(form)));
    if (point && form.querySelector('#v2-coord-state').textContent.startsWith('✓')) selectedPoint(form.querySelector('.v58-place-search'), { name: form.querySelector('[name=location]').value || '手机定位地点', lat: point[0], lon: point[1] });
  };

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing || !event.target.matches('.v58-place-query')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    searchPlace(event.target.closest('.v58-place-search'));
  }, true);

  document.addEventListener('input', event => {
    if (!event.target.matches('.v58-place-query') || event.target.closest('#sighting-form')) return;
    const scope = event.target.closest('.v58-place-search');
    searchStates.get(scope)?.controller?.abort(); searchStates.delete(scope);
    scope.querySelector('[data-action="v58-search-place"]').disabled = false;
    scope.querySelector('.v58-search-results').replaceChildren();
    scope.querySelector('.v58-search-state').textContent = '';
  });

  function groupCard(group) {
    const first = group.first, cover = group.records.flatMap(sightingPhotos)[0] || '';
    return `<button class="atlas-card v56-group-card" type="button" data-action="sighting-detail" data-id="${esc(first.id)}"><div class="card-photo">${imgTag(cover, first.name)}<span class="v56-count-badge">${group.records.length} 次发现</span><div class="v571-card-caption"><h3>${esc(first.name)}</h3>${group.latin ? `<p class="latin">${esc(group.latin)}</p>` : ''}</div></div></button>`;
  }

  function matchedGroups() {
    const query = ui.atlasSearch.trim().toLowerCase();
    return groups().filter(group => !query || group.records.some(record => [record.name, record.latin, record.location, observation(record.notes)].join(' ').toLowerCase().includes(query)));
  }

  const oldAtlas = atlasView;
  atlasView = function() {
    const root = document.createElement('div'); root.innerHTML = oldAtlas();
    const page = root.querySelector('.v50-atlas');
    if (!page) return root.innerHTML;
    const matched = matchedGroups();
    const rows = matched.flatMap(group => group.records);
    const grid = page.querySelector('.catalog-grid');
    if (grid) grid.innerHTML = matched.length ? matched.map(groupCard).join('') : empty('这里还没有发现档案', '记录一次植物相遇，足迹就会出现在这里。', '记录发现', 'new-sighting');
    const count = page.querySelector('.intro-row .subtle');
    if (count) count.textContent = `${matched.length} 种植物 · ${rows.length} 次发现`;
    const heading = page.querySelector('.intro-row .section-title');
    if (heading) heading.textContent = '发现档案';
    const sampleHeading = [...page.querySelectorAll('.intro-row')].find(row => row.textContent.includes('植物小百科'));
    if (sampleHeading) {
      const sampleGrid = sampleHeading.nextElementSibling;
      if (sampleGrid?.classList.contains('catalog-grid')) sampleGrid.remove();
      sampleHeading.remove();
    }
    page.querySelector('.toolbar')?.insertAdjacentHTML('afterend', mapSection(rows, atlasMapId, '发现足迹地图'));
    return root.innerHTML;
  };

  const oldRender = render;
  render = function() {
    destroyMap(atlasMapId);
    oldRender();
    if (ui.tab === 'atlas') mountMap(atlasMapId, matchedGroups().flatMap(group => group.records));
  };

  sightingDetail = function(id) {
    destroyMap(recordMapId);
    const group = groupFor(id);
    if (!group) return;
    const { first, records } = group, cover = records.flatMap(sightingPhotos)[0] || '', locationRows = places(records);
    const placeCards = locationRows.map(place => `<div class="v56-place-card"><span>${ico('pin', 18)} <b>${esc(place.name)}</b></span><strong>${place.count} 次</strong><small>首次 ${esc(datePretty(place.first))} · 最近 ${esc(datePretty(place.latest))}</small></div>`).join('');
    const timeline = records.map((record, index) => {
      const point = coordinate(record), note = observation(record.notes), photos = sightingPhotos(record);
      const osm = point ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(point[0])}&mlon=${encodeURIComponent(point[1])}#map=16/${encodeURIComponent(point[0])}/${encodeURIComponent(point[1])}` : '';
      return `<article class="v56-visit"><div class="v56-visit-top"><span class="v56-dot" aria-hidden="true"></span><b>${esc(datePretty(record.date))}</b><span class="v56-place-pill">${ico('pin', 13)} ${esc(record.location || '地点未记录')}</span>${index === records.length - 1 ? '<span class="v56-first-pill">首次发现</span>' : ''}</div>${note ? `<p class="v56-visit-note">${esc(note)}</p>` : '<p class="v56-visit-note v56-muted">未填写当时备注</p>'}${photos.length ? `<p class="v57-photo-count">${photos.length} 张照片</p><div class="v57-visit-photos">${photos.map((photo, photoIndex) => `<button class="v56-visit-photo" type="button" data-action="v57-view-photo" data-id="${esc(record.id)}" data-index="${photoIndex}" aria-label="查看${esc(record.name)}第 ${photoIndex + 1} 张照片">${imgTag(photo, record.name)}</button>`).join('')}</div>` : ''}<div class="v56-visit-actions"><button type="button" data-action="edit-sighting" data-id="${esc(record.id)}">编辑这次发现</button>${osm ? `<a href="${osm}" target="_blank" rel="noopener noreferrer">查看地点 ↗</a>` : ''}</div></article>`;
    }).join('');
    modal('发现档案 · ' + first.name, `<div class="v56-record-page"><div class="v56-record-cover">${imgTag(cover, first.name)}<span>发现档案 · FIELD NOTES</span></div><div class="v56-record-head"><div><h2>${esc(first.name)}</h2><p class="latin">${esc(group.latin || '学名尚待核实')}</p></div><strong>${records.length} 次发现</strong></div><div class="v56-record-stats"><span>观察次数 <b>${records.length}</b></span><span>记录地点 <b>${locationRows.filter(place => place.name !== '未记录地点').length}</b></span></div><section class="v56-observation"><div class="v56-section-title"><h3>观察足迹</h3><span>按地点汇总</span></div><div class="v56-place-list">${placeCards}</div></section>${mapSection(records, recordMapId, '发现足迹地图')}<section class="v56-timeline"><div class="v56-section-title"><h3>发现记录</h3><span>备注与照片按日期排列</span></div>${timeline}</section><div class="v56-record-actions"><button class="outlined-btn" type="button" data-action="v56-add-plant" data-id="${esc(first.id)}">＋ 加入我的植物</button><button class="outlined-btn" type="button" data-action="v56-add-record" data-id="${esc(first.id)}">＋ 添加记录</button><button class="primary-btn" type="button" data-action="v56-open-guide" data-id="${esc(first.id)}">了解植物百科 →</button></div></div>`);
    document.querySelector('#modal-root .modal')?.classList.add('v56-record-modal');
    mountMap(recordMapId, records);
  };

  function guideKey(group) { return encyclopedia.keyFor({ name: group.first.name, latin: group.latin }); }
  function guideContent(entry) {
    const root = document.createElement('div');
    root.innerHTML = encyclopedia.guide(entry, '', false);
    const taxonomy = document.createElement('div'); taxonomy.className = 'v56-taxonomy';
    taxonomy.innerHTML = [['科', entry.family], ['属', entry.genus], ['种', entry.latin]].filter(([, value]) => value).map(([label, value]) => `<div><small>${label}</small><strong>${esc(value)}</strong></div>`).join('');
    if (taxonomy.childElementCount) (root.querySelector('.v54-summary') || root.querySelector('.v54-guide-head'))?.after(taxonomy);
    return root.innerHTML;
  }

  function generateGuide(group, key) {
    if (pendingGuides.has(key)) return pendingGuides.get(key);
    const pending = (async () => {
      const result = await v2post('/api/ai', { mode: 'species', format: 'encyclopedia', plant: { name: group.first.name, latin: group.latin }, question: '请撰写正式植物百科文章，直接介绍植物学特征、分布、生境与养护方法。正文只写有依据的知识，不描述照片。' });
      const entry = encyclopedia.validateEntry(result.encyclopedia);
      if (group.latin && entry.latin) {
        const genusSpecies = value => value.toLowerCase().match(/^[a-z]+\s+[a-z-]+/)?.[0] || '';
        if (genusSpecies(group.latin) && genusSpecies(entry.latin) && genusSpecies(group.latin) !== genusSpecies(entry.latin)) throw Error('百科返回的学名与档案不一致，请先核对物种名称。');
      }
      state.encyclopediaEntries = state.encyclopediaEntries && typeof state.encyclopediaEntries === 'object' && !Array.isArray(state.encyclopediaEntries) ? state.encyclopediaEntries : {};
      state.encyclopediaEntries[key] = entry;
      await save();
      return entry;
    })();
    pendingGuides.set(key, pending);
    pending.then(() => pendingGuides.delete(key), () => pendingGuides.delete(key));
    return pending;
  }

  async function openGuide(id, refresh = false) {
    destroyMap(recordMapId);
    const group = groupFor(id);
    if (!group) return;
    const cover = group.records.flatMap(sightingPhotos)[0] || '';
    const key = guideKey(group), cached = state.encyclopediaEntries?.[key];
    modal('植物百科 · ' + group.first.name, `<div class="v56-encyclopedia"><div class="v56-guide-cover">${imgTag(cover, group.first.name)}</div><div class="v56-guide-nav"><button type="button" class="outlined-btn" data-action="v56-back-record" data-id="${esc(id)}">← 返回发现档案</button><button type="button" class="outlined-btn" data-action="v56-refresh-guide" data-id="${esc(id)}">更新百科</button></div><p class="v57-cache-state" id="v57-cache-state" role="status"></p><div id="v56-guide-content" aria-live="polite"></div></div>`);
    document.querySelector('#modal-root .modal')?.classList.add('v56-record-modal', 'v56-guide-modal');
    const target = document.getElementById('v56-guide-content');
    const status = document.getElementById('v57-cache-state'), refreshButton = document.querySelector('[data-action="v56-refresh-guide"]');
    let hasCached = false;
    if (cached) {
      try {
        target.innerHTML = guideContent(encyclopedia.validateEntry(cached)); hasCached = true;
        status.textContent = '已保存在本机 · 点击“更新百科”才会重新生成';
        if (!refresh) return;
      } catch { /* invalid cache: generate once */ }
    }
    if (!hasCached) target.innerHTML = '<p class="v54-loading" role="status">正在整理植物的形态、分布与养护知识…</p>';
    status.textContent = hasCached ? '正在更新，完成后自动保存…' : '首次生成后会自动保存在本机';
    refreshButton.disabled = true;
    try {
      const entry = await generateGuide(group, key);
      if (target.isConnected) {
        target.innerHTML = guideContent(entry);
        status.textContent = '已保存在本机 · 点击“更新百科”才会重新生成';
      }
    } catch (error) {
      if (target.isConnected) {
        status.textContent = hasCached ? '更新未完成，已保存的百科仍可阅读' : '生成未完成，可点击“更新百科”重试';
        const message = `<p class="v2-ai-error" role="alert">${esc(error.message)}</p>`;
        if (hasCached) target.insertAdjacentHTML('afterbegin', message); else target.innerHTML = message;
      }
    } finally { if (refreshButton.isConnected) refreshButton.disabled = false; }
  }

  const oldAct = act;
  act = async function(action, element) {
    const id = element.dataset.id;
    if (action === 'v58-search-place') return searchPlace(element.closest('.v58-place-search'));
    if (action === 'v58-select-place') {
      const scope = element.closest('.v58-place-search'), point = searchStates.get(scope)?.results[Number(element.dataset.index)];
      if (point) selectedPoint(scope, { ...point, lat: Number(point.lat), lon: Number(point.lon) });
      return;
    }
    if (action === 'v58-record-place') {
      const point = coordinate(element.dataset); if (!point) return;
      const group = groupFor(id);
      destroyMap(recordMapId);
      sightingForm(null, { name: group?.first.name || '', latin: group?.latin || '', location: element.dataset.name, lat: point[0], lon: point[1] });
      return;
    }
    if (action === 'v56-add-record') {
      const group = groupFor(id);
      if (group) { destroyMap(recordMapId); sightingForm(null, { name: group.first.name, latin: group.latin }); }
      return;
    }
    if (action === 'v56-add-plant') {
      const group = groupFor(id);
      if (group) {
        destroyMap(recordMapId);
        plantForm(null, { name: group.first.name, latin: group.latin, image: group.records.flatMap(sightingPhotos)[0] || '' });
        document.querySelector('#modal-root .modal-header h2').textContent = '加入我的植物';
      }
      return;
    }
    if (action === 'v56-open-guide') return openGuide(id);
    if (action === 'v56-refresh-guide') return openGuide(id, true);
    if (action === 'v56-back-record') return sightingDetail(id);
    if (action === 'edit-sighting') destroyMap(recordMapId);
    return oldAct(action, element);
  };

  const oldClose = closeModal;
  closeModal = function() { destroyMap(recordMapId); destroyMap(pickerMapId); oldClose(); };
})();

/* 万物生 v5.7 · 观察相册、百科保存与植物状态。 */
(() => {
  'use strict';
  const drafts = new WeakMap();
  let lightbox = null;

  const oldNav = renderNav;
  renderNav = function() {
    oldNav();
    document.querySelector('#mobile-nav [data-nav="settings"]')?.remove();
  };
  const oldSettings = settingsView;
  settingsView = function() {
    const root = document.createElement('div'); root.innerHTML = oldSettings();
    root.querySelector('.v4-me-card')?.remove();
    return root.innerHTML;
  };
  const oldCard = plantCard;
  plantCard = function(plant) {
    const root = document.createElement('div'); root.innerHTML = oldCard(plant);
    const status = String(plant.status || '').trim();
    if (status && status !== '健康') {
      const badge = document.createElement('span');
      badge.className = 'v57-status-badge ' + (status === '生病中' ? 'is-ill' : status === '需关注' ? 'needs-attention' : 'is-custom');
      badge.textContent = (status === '生病中' ? '✚ ' : status === '需关注' ? '! ' : '● ') + status;
      root.querySelector('.card-photo')?.append(badge);
    }
    return root.innerHTML;
  };

  function paintDraft(form) {
    const draft = drafts.get(form), gallery = form.querySelector('#sighting-preview');
    if (!draft || !gallery) return;
    gallery.innerHTML = draft.images.length ? draft.images.map((src, index) => `<div class="v57-photo-item">${imgTag(src, `观察照片 ${index + 1}`)}<button type="button" data-action="v57-remove-photo" data-index="${index}" aria-label="移除第 ${index + 1} 张照片" ${draft.busy ? 'disabled' : ''}>×</button><span>${index + 1}</span></div>`).join('') : '<p class="v57-no-photos">为这次观察添加照片</p>';
    form.querySelector('.v57-upload-status').textContent = draft.busy ? '正在处理照片…' : `已添加 ${draft.images.length} 张，可继续添加`;
    for (const button of form.querySelectorAll('[type="submit"], [data-action="v57-pick-photos"]')) button.disabled = draft.busy;
    form.querySelector('#sighting-image').disabled = draft.busy;
  }

  const oldForm = sightingForm;
  sightingForm = function(sid = null, prefill = {}) {
    const source = state.sightings.find(record => record.id === sid) || prefill;
    oldForm(sid, prefill);
    const form = document.getElementById('sighting-form'), input = form?.querySelector('#sighting-image');
    if (!input) return;
    const marker = '【AI 植物百科草稿】', notes = String(source.notes || ''), markerIndex = notes.indexOf(marker);
    const draft = { images: [...sightingPhotos(source)], busy: false, encyclopedia: source.encyclopedia || null, legacyNotes: markerIndex >= 0 ? notes.slice(markerIndex) : '' };
    drafts.set(form, draft);
    if (markerIndex >= 0) form.querySelector('[name="notes"]').value = notes.slice(0, markerIndex).trim();
    const field = input.closest('.field');
    field.classList.add('v57-photo-field');
    field.innerHTML = '<label for="sighting-image">这次观察的照片</label><div id="sighting-preview" class="v57-photo-grid"></div><div class="v57-upload-actions"><button type="button" class="outlined-btn" data-action="v57-pick-photos">＋ 添加照片</button><span class="v57-upload-status" role="status"></span></div><input id="sighting-image" name="images" type="file" accept="image/*" multiple hidden>';
    paintDraft(form);
  };

  document.addEventListener('change', async event => {
    if (event.target?.id !== 'sighting-image') return;
    event.stopImmediatePropagation();
    const input = event.target, form = input.closest('form'), draft = drafts.get(form);
    if (!draft || draft.busy) return;
    const files = [...input.files];
    if (!files.length) return;
    draft.busy = true; paintDraft(form);
    let failed = 0;
    for (const file of files) {
      try {
        if (!file.type.startsWith('image/')) throw Error('请选择图片');
        const photo = await compress(file);
        if (!form.isConnected) return;
        draft.images.push(photo);
      } catch { failed++; }
    }
    draft.busy = false; input.value = '';
    if (form.isConnected) {
      paintDraft(form);
      if (failed) toast(`${failed} 张照片未能读取，请换用 JPEG 或 PNG 图片重试。`);
    }
  }, true);

  const oldSubmit = handleSubmit;
  handleSubmit = async function(form) {
    if (form.id !== 'sighting-form' || !drafts.has(form)) return oldSubmit(form);
    const draft = drafts.get(form);
    if (draft.busy) throw Error('照片正在处理，请稍候');
    const data = new FormData(form), existing = state.sightings.find(record => record.id === form.dataset.id);
    const name = String(data.get('name') || '').trim(), latin = String(data.get('latin') || '').trim();
    if (!name) throw Error('请输入植物名称');
    const record = { ...existing, id: existing?.id || id(), name, latin, location: String(data.get('location') || '').trim(), date: String(data.get('date') || ''), notes: [String(data.get('notes') || '').trim(), draft.legacyNotes].filter(Boolean).join('\n\n'), images: [...draft.images], image: draft.images[0] || '' };
    delete record.photo;
    const lat = data.get('lat'), lon = data.get('lon');
    if (lat !== null && lon !== null && lat !== '' && lon !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180) { record.lat = Number(lat); record.lon = Number(lon); }
    else { delete record.lat; delete record.lon; }
    if (existing) state.sightings[state.sightings.indexOf(existing)] = record; else state.sightings.unshift(record);
    if (draft.encyclopedia) {
      const entry = window.yiyuEncyclopedia.validateEntry(draft.encyclopedia);
      const sameTopic = latin ? latin.toLowerCase() === entry.latin.toLowerCase() : name === entry.name;
      if (sameTopic) {
        state.encyclopediaEntries = state.encyclopediaEntries && typeof state.encyclopediaEntries === 'object' && !Array.isArray(state.encyclopediaEntries) ? state.encyclopediaEntries : {};
        const key = window.yiyuEncyclopedia.keyFor(record);
        if (!state.encyclopediaEntries[key]) state.encyclopediaEntries[key] = entry;
      }
    }
    state.isDemo = false;
    await save(); closeModal(); render(); toast('发现记录与照片已保存');
  };

  function closePhoto() {
    document.getElementById('v57-lightbox')?.remove();
    const focus = lightbox?.focus;
    lightbox = null;
    if (focus?.isConnected) focus.focus({ preventScroll: true });
  }
  function paintPhoto() {
    const root = document.getElementById('v57-lightbox');
    if (!root || !lightbox) return;
    const { photos, index, name } = lightbox;
    root.querySelector('.v57-lightbox-image').innerHTML = imgTag(photos[index], `${name} · 照片 ${index + 1}`);
    root.querySelector('.v57-lightbox-count').textContent = `${index + 1} / ${photos.length}`;
    root.querySelector('[data-action="v57-prev-photo"]').disabled = index === 0;
    root.querySelector('[data-action="v57-next-photo"]').disabled = index === photos.length - 1;
  }
  function openPhoto(sid, index) {
    const record = state.sightings.find(item => item.id === sid), photos = sightingPhotos(record);
    if (!photos.length) return;
    closePhoto();
    lightbox = { photos, name: record.name, index: Math.min(Math.max(Number(index) || 0, 0), photos.length - 1), focus: document.activeElement };
    const root = document.createElement('div'); root.id = 'v57-lightbox'; root.className = 'v57-lightbox'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '观察照片');
    root.innerHTML = '<button class="v57-lightbox-shade" type="button" data-action="v57-close-photo" aria-label="关闭照片"></button><div class="v57-lightbox-body"><button class="v57-lightbox-close" type="button" data-action="v57-close-photo" aria-label="关闭照片">×</button><div class="v57-lightbox-image"></div><div class="v57-lightbox-controls"><button type="button" data-action="v57-prev-photo">← 上一张</button><span class="v57-lightbox-count" role="status"></span><button type="button" data-action="v57-next-photo">下一张 →</button></div></div>';
    document.body.append(root); paintPhoto(); root.querySelector('.v57-lightbox-close').focus();
  }
  document.addEventListener('keydown', event => {
    if (!lightbox) return;
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') return closePhoto();
      if (event.key === 'ArrowLeft') lightbox.index = Math.max(0, lightbox.index - 1);
      if (event.key === 'ArrowRight') lightbox.index = Math.min(lightbox.photos.length - 1, lightbox.index + 1);
      if (event.key === 'Tab') {
        const buttons = [...document.querySelectorAll('#v57-lightbox .v57-lightbox-body button:not(:disabled)')];
        const i = buttons.indexOf(document.activeElement);
        buttons[(i + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      } else paintPhoto();
    }
  }, true);

  const oldAct = act;
  act = async function(action, element) {
    if (action === 'v57-pick-deepseek') return document.getElementById('v2-ai-image')?.click();
    if (action === 'v57-pick-photos') return element.closest('form')?.querySelector('#sighting-image')?.click();
    if (action === 'v57-remove-photo') {
      const form = element.closest('form'), draft = drafts.get(form);
      if (draft && !draft.busy) { draft.images.splice(Number(element.dataset.index), 1); paintDraft(form); }
      return;
    }
    if (action === 'v57-view-photo') return openPhoto(element.dataset.id, element.dataset.index);
    if (action === 'v57-close-photo') return closePhoto();
    if (lightbox && ['v57-prev-photo', 'v57-next-photo'].includes(action)) {
      lightbox.index += action === 'v57-prev-photo' ? -1 : 1;
      lightbox.index = Math.min(Math.max(0, lightbox.index), lightbox.photos.length - 1); paintPhoto(); return;
    }
    return oldAct(action, element);
  };
  const oldClose = closeModal;
  closeModal = function() { closePhoto(); oldClose(); };
})();

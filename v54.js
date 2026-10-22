/* 万物生 v5.4 · 识别百科与图鉴收藏，沿用现有本地档案和备份结构。 */
(() => {
  'use strict';
  const chapters = [
    ['morphology', '形态特征'], ['distribution', '分布与生境'], ['cultivation', '栽培技术'],
    ['uses', '主要价值'], ['culture', '植物文化'], ['similar', '近种区别']
  ];
  const marker = '【AI 植物百科草稿】';
  let current = null, currentPlantGuide = null, requestId = 0, photoBusy = false;
  const plantGuides = new Map();

  function guide(entry, actions = '') {
    const taxonomy = [entry.family, entry.genus].filter(Boolean).join(' · ');
    return `<article class="v54-guide" aria-label="植物百科介绍">
      <header class="v54-guide-head"><span class="v54-guide-kicker">BOTANICAL ENCYCLOPEDIA · 植物百科</span><h3>${esc(entry.name)}</h3>${entry.latin ? `<p class="latin">${esc(entry.latin)}</p>` : ''}${taxonomy ? `<p>${esc(taxonomy)}</p>` : ''}<span class="v54-draft-label">${entry.uncertain ? '物种尚待确认 · AI 草稿' : '候选识别 · AI 草稿'}</span></header>
      ${entry.summary ? `<p class="v54-summary">${esc(entry.summary)}</p>` : ''}
      ${entry.evidence ? `<details class="v54-evidence"><summary>识别依据与核对建议</summary><p>${esc(entry.evidence)}</p></details>` : ''}
      <div class="v54-chapters">${chapters.map(([key, title], index) => `<details ${index === 0 ? 'open' : ''}><summary><span>${String(index + 1).padStart(2, '0')}</span>${title}</summary><p>${esc(entry.sections[key])}</p></details>`).join('')}</div>
      <p class="v54-guide-notice">AI 生成内容需核对，候选名称不等同于物种鉴定。保存前可修改名称和学名。</p>${actions ? `<div class="v54-guide-actions">${actions}</div>` : ''}</article>`;
  }

  function validateEntry(value) {
    if (!value || typeof value.name !== 'string' || !value.name.trim() || chapters.some(([key]) => typeof value.sections?.[key] !== 'string' || !value.sections[key].trim())) throw Error('服务未返回完整植物百科，请检查后端地址或重新分析。');
    const text = (v, limit = 1200) => typeof v === 'string' ? v.trim().slice(0, limit) : '';
    return { name: text(value.name, 100), latin: text(value.latin, 180), family: text(value.family, 100), genus: text(value.genus, 100), summary: text(value.summary), evidence: text(value.evidence), uncertain: value.uncertain !== false, sections: Object.fromEntries(chapters.map(([key]) => [key, text(value.sections[key])])) };
  }

  function notesFor(entry, source) {
    return [marker, `来源：${source} · AI 生成，需核实`, '识别候选，保存不代表已确认物种。', `【科属信息】\n科：${entry.family || '待核实'}\n属：${entry.genus || '待核实'}`, `【概述】\n${entry.summary || ''}`, `【识别依据与核对】\n${entry.evidence || ''}`, ...chapters.map(([key, title]) => `【${title}】\n${entry.sections[key]}`)].join('\n\n');
  }

  function savedGuide(sighting) {
    const notes = sighting.notes || '', start = notes.indexOf(marker);
    if (start < 0) return null;
    const sections = {};
    for (let i = 0; i < chapters.length; i++) {
      const heading = `【${chapters[i][1]}】`, from = notes.indexOf(heading, start);
      if (from < 0) return null;
      const next = i + 1 < chapters.length ? notes.indexOf(`【${chapters[i + 1][1]}】`, from + heading.length) : notes.length;
      if (next < 0) return null;
      sections[chapters[i][0]] = notes.slice(from + heading.length, next).trim();
    }
    const between = (from, to) => { const a = notes.indexOf(from, start), b = a < 0 ? -1 : notes.indexOf(to, a + from.length); return a < 0 || b < 0 ? '' : notes.slice(a + from.length, b).trim(); };
    const taxonomy = between('【科属信息】', '【概述】');
    return { name: sighting.name, latin: sighting.latin, family: taxonomy.match(/^科：(.+)$/m)?.[1] || '', genus: taxonomy.match(/^属：(.+)$/m)?.[1] || '', summary: between('【概述】', '【识别依据与核对】') || '已保存的识别植物百科草稿，可在编辑记录中修改，资料仍需核实。', evidence: between('【识别依据与核对】', '【形态特征】'), uncertain: true, sections };
  }

  function addToAtlas(value) {
    if (!value) return toast('请先完成识别');
    const { entry, image, source } = value;
    sightingForm(null, { name: entry.name, latin: entry.latin || '', image: image || '', notes: entry.sections ? notesFor(entry, source) : `${source} 识别候选，需结合实物核对。${entry.evidence || ''}` });
    const title = document.querySelector('#modal-root h2');
    if (title) title.textContent = '加入植物图鉴';
    const submit = document.querySelector('#sighting-form [type="submit"]');
    if (submit) submit.textContent = '保存到图鉴';
  }

  const previousRun = v2aiRun;
  v2aiRun = async function(pid, mode) {
    if (!['identification', 'identify'].includes(mode) || !ui.v53DeepSeekOpen || ui.tab !== 'recognize') return previousRun(pid, mode);
    if (photoBusy) return toast('照片正在处理，请稍候');
    if (!ui.aiImage) return toast('请先选择植物照片');
    const box = document.getElementById('v2-ai-result'), button = document.getElementById('v2-ai-run'), input = document.getElementById('v2-ai-image');
    if (!box || !button || button.disabled) return;
    const token = ++requestId, image = ui.aiImage;
    const question = '请根据这张照片识别可能的植物，并整理六章节植物百科；不确定时指出需要核对的特征。';
    current = null; button.disabled = true; if (input) input.disabled = true;
    box.innerHTML = '<p class="v54-loading" role="status">正在辨认照片并整理六章节植物百科…</p>';
    ui.v53AIAnswer = box.innerHTML;
    try {
      const result = await v2post('/api/ai', { mode: 'identify', format: 'encyclopedia', plant: {}, question, image });
      if (token !== requestId || ui.aiImage !== image) return;
      const entry = validateEntry(result.encyclopedia);
      current = { entry, image, source: result.model || 'DeepSeek' };
      ui.v53AIAnswer = guide(entry, '<button type="button" class="primary-btn" data-action="v54-add-ai">＋ 加入植物图鉴</button>');
      if (box.isConnected) box.innerHTML = ui.v53AIAnswer;
    } catch (error) {
      if (token !== requestId) return;
      ui.v53AIAnswer = `<p class="v2-ai-error" role="alert">${esc(error.message)}</p>`;
      if (box.isConnected) box.innerHTML = ui.v53AIAnswer;
    } finally {
      button.disabled = false; if (input) input.disabled = false;
    }
  };

  document.addEventListener('change', async event => {
    if (event.target?.id !== 'v2-ai-image' || !ui.v53DeepSeekOpen || ui.tab !== 'recognize') return;
    event.stopImmediatePropagation();
    const input = event.target, file = input.files?.[0];
    if (!file) return;
    const token = ++requestId;
    current = null; ui.aiImage = null; ui.v53AIAnswer = ''; photoBusy = true;
    const box = document.getElementById('v2-ai-result'), button = document.getElementById('v2-ai-run');
    if (box) box.innerHTML = '';
    if (button) button.disabled = true;
    const label = document.getElementById('v53-file-label'); if (label) label.textContent = '正在处理照片…';
    try {
      const image = await compress(file);
      if (token !== requestId) return;
      ui.aiImage = image;
      const holder = document.getElementById('v2-ai-photo-preview');
      if (holder) { holder.innerHTML = ''; const preview = document.createElement('img'); preview.src = image; preview.alt = '待分析的植物照片'; holder.append(preview); }
      if (label) label.textContent = file.name;
    } catch (error) { if (token === requestId) { if (label) label.textContent = '照片处理失败，请重新选择'; toast(error.message); } }
    finally { if (token === requestId) { photoBusy = false; if (button) button.disabled = false; } }
  }, true);

  const previousCard = v453CandidateCard;
  v453CandidateCard = function(result, index) {
    return previousCard(result, index).replace('</article>', `<div class="v54-candidate-actions"><button type="button" class="primary-btn" data-action="v54-add-plantnet" data-id="${index}">＋ 加入植物图鉴</button><button type="button" class="outlined-btn" data-action="v54-plantnet-guide" data-id="${index}">查看植物百科</button></div></article>`);
  };

  function plantnetValue(index) {
    const result = ui.recognitionResults?.[Number(index)];
    if (!result) return null;
    const latin = v453Latin(result), name = v453DisplayName(result), key = latin || name;
    const entry = plantGuides.get(key) || { name, latin, evidence: 'Pl@ntNet 候选结果，匹配分数不是鉴定准确率。' };
    return { entry, image: ui.recognitionImage || '', source: plantGuides.has(key) ? 'Pl@ntNet 候选 · DeepSeek 百科草稿' : 'Pl@ntNet', key };
  }

  async function showPlantnetGuide(index) {
    const value = plantnetValue(index); if (!value) return;
    modal('植物百科 · ' + value.entry.name, '<div id="v54-plantnet-guide" aria-live="polite"><p class="v54-loading">正在整理这株候选植物的六章节百科…</p></div>');
    const target = document.getElementById('v54-plantnet-guide');
    try {
      if (!value.entry.sections) {
        const result = await v2post('/api/ai', { mode: 'species', format: 'encyclopedia', plant: { name: value.entry.name, latin: value.entry.latin }, question: '请介绍这个尚待实物核对的识别候选，按六章节整理植物百科草稿。' });
        value.entry = validateEntry(result.encyclopedia); plantGuides.set(value.key, value.entry);
      }
      if (target.isConnected) {
        currentPlantGuide = { ...value, source: 'Pl@ntNet 候选 · DeepSeek 百科草稿' };
        target.innerHTML = guide(value.entry, '<button type="button" class="primary-btn" data-action="v54-add-open-guide">＋ 加入植物图鉴</button>');
      }
    } catch (error) { if (target.isConnected) target.innerHTML = `<p class="v2-ai-error" role="alert">${esc(error.message)}</p>`; }
  }

  const previousAct = act;
  act = async function(action, element) {
    if (action === 'v54-add-ai') return addToAtlas(current);
    if (action === 'v54-add-open-guide') return addToAtlas(currentPlantGuide);
    if (action === 'v54-add-plantnet') return addToAtlas(plantnetValue(element.dataset.id));
    if (action === 'v54-plantnet-guide') return showPlantnetGuide(element.dataset.id);
    return previousAct(action, element);
  };

  const previousSightingDetail = sightingDetail;
  sightingDetail = function(sid) {
    previousSightingDetail(sid);
    const sighting = state.sightings.find(item => item.id === sid);
    if (!sighting) return;
    const entry = savedGuide(sighting), knowledge = document.querySelector('#modal-root .v47-wild-knowledge');
    if (!entry || !knowledge) return;
    const actions = knowledge.querySelector('.v47-wild-actions')?.outerHTML || '';
    knowledge.innerHTML = guide(entry) + actions + '<div id="v47-wild-info" class="v47-wild-remote" aria-live="polite"></div>';
    const prefix = (sighting.notes || '').split(marker)[0].trim();
    for (const section of document.querySelectorAll('#modal-root .v2-subpanel')) {
      if (section.querySelector('h3')?.textContent === '当时的观察') section.querySelector('p').textContent = prefix || '由识别结果加入图鉴，六章节百科草稿已保存在下方。';
    }
  };

  const previousRecognize = recognizeView;
  recognizeView = function() {
    if (current && ui.aiImage !== current.image) { current = null; ui.v53AIAnswer = ''; }
    return previousRecognize();
  };
})();

/* 설계기준 검색 탭.
   색인(data/standards-index-*.js)은 크기가 커서 이 탭을 처음 열 때만 불러온다.
   결과 문장은 원문 그대로 보여주고, 긴 조항은 검색어가 있는 줄부터 발췌한다. */
(() => {
  'use strict';
  const PAGE_SIZE = 50;
  const EXCERPT_LEAD = 200;   // 검색어 앞에 남길 글자 수. 접힌 카드 맨 위에 검색어가 보이도록 짧게 둔다.
  const EXCERPT_LEN = 2400;   // 카드에 발췌해 보여줄 최대 글자 수
  const input = document.getElementById('stdSearchQ');
  const filters = document.getElementById('stdFilters');
  const meta = document.getElementById('stdMeta');
  const list = document.getElementById('stdResults');
  const panel = document.querySelector('.tab-panel[data-tab="standards-search"]');
  if (!input || !filters || !meta || !list || !panel) return;

  const norm = (s) => String(s || '').replace(/\s+/g, '');
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let synonyms = [];
  let loaded = false, loading = false;
  let filter = 'all';
  let results = [], query = null, limit = PAGE_SIZE, timer = null;

  function synonymGroup(word) {
    const n = norm(word);
    if (!n) return null;
    const g = synonyms.find((group) => group.some((w) => norm(w) === n));
    return g ? [...new Set([word, ...g])] : null;
  }

  // 검색어 전체가 동의어 표기(예: '매설 깊이')이면 한 단어로 본다.
  // 아니면 공백으로 나눈 각 단어가 한 조항 안에 모두 있어야 한다(단어별 동의어 포함).
  function parseQuery(raw) {
    const whole = synonymGroup(raw);
    if (whole) return { groups: [whole], phrase: null };
    const tokens = raw.split(/\s+/).filter(Boolean);
    return { groups: tokens.map((t) => synonymGroup(t) || [t]), phrase: tokens.length > 1 ? norm(raw) : null };
  }

  function positions(text, w, max) {
    const out = [];
    for (let i = text.indexOf(w); i !== -1 && out.length < max; i = text.indexOf(w, i + 1)) out.push(i);
    return out;
  }

  // 여러 단어가 조항 안에서 가장 가깝게 모여 있는 구간의 길이. 각 단어의 첫 위치만 보면
  // '맨홀 … (한참 뒤) … 간격'이 '맨홀의 최대 간격'보다 앞설 수 있다.
  function closestSpan(groupsPos) {
    let best = Infinity;
    for (const p0 of groupsPos[0]) {
      let lo = p0, hi = p0;
      for (let g = 1; g < groupsPos.length; g++) {
        let near = groupsPos[g][0], d = Math.abs(near - p0);
        for (const pg of groupsPos[g]) { const dd = Math.abs(pg - p0); if (dd < d) { d = dd; near = pg; } }
        lo = Math.min(lo, near); hi = Math.max(hi, near);
      }
      best = Math.min(best, hi - lo);
    }
    return best;
  }

  function score(chunk, doc, q) {
    // 제목은 상위 조항 경로까지 포함해 본다. 본문 없는 상위 제목('5. 터파기 지보')은 색인에서 빠지고 하위 조항 경로에만 남는다.
    const text = norm(chunk.text), title = norm(chunk.path_str || chunk.clause_title);
    let s = 0;
    const groupsPos = [];
    for (const group of q.groups) {
      let hit = false;
      const pos = [];
      for (const w of group) {
        const nw = norm(w);
        if (!nw) continue;
        if (title.includes(nw)) { s += 10; hit = true; }
        const found = positions(text, nw, 60);
        if (found.length) { s += 1; hit = true; pos.push(...found); }
      }
      if (!hit) return -1;
      if (pos.length) groupsPos.push(pos);
    }
    // 띄어 쓴 검색어는 붙어 있는 구절이 있는 조항을 맨 앞에 둔다. 그래서 '최소 유속'의 앞쪽 결과는 '최소유속'과 같다.
    if (q.phrase && (text.includes(q.phrase) || title.includes(q.phrase))) s += 5000;
    else if (groupsPos.length > 1) s += 1000 / (closestSpan(groupsPos) + 1);
    if (doc.revision_date) s += 0.5;
    if (doc.document_role === 'revision_comparison' || doc.document_role === 'review_draft_label') s -= 5;
    return s;
  }

  function highlighter(q) {
    const words = [...new Set(q.groups.flat().map(norm).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!words.length) return null;
    // 본문에서 '매설 깊이'처럼 띄어 쓴 표기도 강조되게 글자 사이 공백을 허용한다.
    return new RegExp(words.map((w) => [...w].map(escapeRe).join('\\s*')).join('|'), 'gi');
  }

  function highlight(text, rx) {
    if (!rx) return esc(text);
    let html = '', last = 0;
    rx.lastIndex = 0;
    for (let m; (m = rx.exec(text));) {
      if (!m[0]) { rx.lastIndex++; continue; }
      html += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return html + esc(text.slice(last));
  }

  // 문장이 끝나는 자리('~다.', '~함.', '.' 등 뒤). 발췌를 문장 중간에서 자르지 않기 위해 쓴다.
  const SENTENCE_END = /(?:[다음함됨임요]\.|[.;:?!])(?=\s|$)/g;
  function lastSentenceEnd(text, from, to) {
    let best = -1;
    SENTENCE_END.lastIndex = from;
    for (let m; (m = SENTENCE_END.exec(text)) && m.index < to;) best = m.index + m[0].length;
    return best;
  }

  function excerpt(text, rx) {
    if (text.length <= EXCERPT_LEN) return { text, cut: false };
    let at = 0;
    if (rx) { rx.lastIndex = 0; const m = rx.exec(text); if (m) at = m.index; }
    // 시작: 검색어가 있는 문단의 처음. 문단이 길면 검색어 앞 문장의 처음.
    let start = text.lastIndexOf('\n', at) + 1;
    if (at - start > EXCERPT_LEAD) {
      const s = lastSentenceEnd(text, Math.max(start, at - EXCERPT_LEAD * 3), at);
      start = s > 0 ? s : at - EXCERPT_LEAD;
    }
    while (start < at && /\s/.test(text[start])) start++;
    // 끝: 문단 끝, 없으면 마지막 문장 끝. 둘 다 없을 때만 글자 수로 자른다.
    let end = Math.min(text.length, start + EXCERPT_LEN);
    if (end < text.length) {
      const para = text.lastIndexOf('\n', end);
      const sent = lastSentenceEnd(text, start + EXCERPT_LEN / 2, end);
      if (para > start + EXCERPT_LEN / 2) end = para;
      else if (sent > 0) end = sent;
    }
    return { text: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''), cut: true };
  }

  function card(item, i, rx) {
    const { chunk, doc } = item;
    const ex = excerpt(chunk.text || '', rx);
    let badges = '';
    if (doc.document_role === 'revision_comparison') badges += '<span class="std-badge old">신구대비표</span>';
    if (doc.document_role === 'review_draft_label') badges += '<span class="std-badge draft">안</span>';
    if (!doc.revision_date && doc.edition_date_hint) badges += '<span class="std-badge">날짜 추정</span>';
    // 출처에는 파일명만 보인다. K-water 수집본 경로는 역슬래시(01_원본\적산지침\…)라 두 구분자 모두 자른다.
    const file = (doc.path || '').split(/[\\/]/).pop();
    return '<article class="std-card" data-i="' + i + '" data-key="' + esc(item.key) + '">' +
      '<div class="std-card-header"><div>' +
        '<div class="std-card-meta"><span>' + esc(doc.code || '') + '</span><span aria-hidden="true">|</span><span>' +
          esc(doc.revision_date || doc.edition_date_hint || '날짜 미상') + '</span>' + badges + '</div>' +
        '<div class="std-card-title">' + esc(doc.title || '') + '</div>' +
      '</div></div>' +
      '<div class="std-card-body">' +
        '<div class="std-card-path">' + esc(chunk.path_str || chunk.clause_title || '') + '</div>' +
        '<p class="std-card-text">' + highlight(ex.text, rx) + '</p>' +
        '<button type="button" class="std-full-toggle" aria-expanded="false">' + (ex.cut ? '조항 전체 보기' : '펼쳐 보기') + '</button>' +
      '</div>' +
      '<div class="std-card-footer">' +
        '<span>출처 - <span title="' + esc(doc.path || '') + '">' + esc(file) + '</span>' +
        (chunk.page ? ' · ' + esc(String(chunk.page)) + '쪽' : '') + '</span>' +
      '</div>' +
    '</article>';
  }

  function draw() {
    const rx = query ? highlighter(query) : null;
    let html = results.slice(0, limit).map((item, i) => card(item, i, rx)).join('');
    if (results.length > limit) html += '<button type="button" id="stdLoadMore" class="std-load-more">더 보기 (' + (results.length - limit).toLocaleString() + '건 남음)</button>';
    list.innerHTML = html || '<p class="empty">결과가 없습니다.</p>';
    // 짧은 조항은 접힌 상태에서도 다 보이므로 펼치기 버튼을 숨긴다.
    list.querySelectorAll('.std-card').forEach((el) => {
      const t = el.querySelector('.std-card-text'), btn = el.querySelector('.std-full-toggle');
      const item = results[Number(el.dataset.i)];
      const cut = item && (item.chunk.text || '').length > EXCERPT_LEN;
      if (btn && !cut && t.scrollHeight <= t.clientHeight + 2) btn.hidden = true;
    });
  }

  function search() {
    if (!loaded) { meta.textContent = '색인 데이터를 불러오는 중...'; return; }
    synonyms = (window.STANDARDS_SYNONYMS && window.STANDARDS_SYNONYMS.synonym_groups) || [];
    const raw = input.value.trim();
    limit = PAGE_SIZE;
    if (!raw) {
      results = []; query = null; list.innerHTML = '<p class="empty">검색어를 입력하세요.</p>';
      // 용어사전 탭과 같은 문구: 검색 전에는 검색 가능한 전체 수를 보여준다.
      const total = (window.STANDARDS_INDEX || []).reduce((n, d) => n + (d.chunks || []).length, 0);
      meta.textContent = '총 ' + total.toLocaleString() + '개 조항 검색 가능';
      return;
    }
    query = parseQuery(raw);
    results = [];
    for (const doc of window.STANDARDS_INDEX || []) {
      if (filter !== 'all' && doc.category !== filter) continue;
      (doc.chunks || []).forEach((chunk, ci) => {
        const s = score(chunk, doc, query);
        if (s > -1) results.push({ chunk, doc, score: s, key: doc.path + '#' + ci });
      });
    }
    results.sort((a, b) => b.score - a.score || String(b.doc.revision_date || '').localeCompare(String(a.doc.revision_date || '')));
    draw();
    const typed = raw.split(/\s+/);
    const extra = [...new Set(query.groups.flat())].filter((w) => norm(w) !== norm(raw) && !typed.includes(w));
    meta.textContent = results.length.toLocaleString() + '개 결과' + (extra.length ? " ('" + extra.join("', '") + "' 포함 검색됨)" : '');
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filters.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('active', c === chip); c.setAttribute('aria-pressed', String(c === chip)); });
    filter = chip.getAttribute('data-filter') || 'all';
    search();
  });
  list.addEventListener('click', (e) => {
    if (e.target.closest('#stdLoadMore')) { limit += PAGE_SIZE; draw(); return; }
    const toggle = e.target.closest('.std-full-toggle');
    if (!toggle) return;
    const el = toggle.closest('.std-card');
    const item = results[Number(el.dataset.i)];
    const textEl = el.querySelector('.std-card-text');
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    const rx = query ? highlighter(query) : null;
    const text = item ? item.chunk.text || '' : '';
    textEl.innerHTML = highlight(open ? text : excerpt(text, rx).text, rx);
    textEl.classList.toggle('expanded', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '접기' : (text.length > EXCERPT_LEN ? '조항 전체 보기' : '펼쳐 보기');
  });

  function addScript(src, onload, onerror) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = onload;
    s.onerror = onerror || onload;
    document.head.appendChild(s);
  }
  function finish() { loaded = true; loading = false; search(); }
  function load() {
    if (loaded || loading) return;
    loading = true;
    meta.textContent = '색인 데이터를 불러오는 중...';
    // 동의어를 먼저 받아 두어야 색인이 도착한 직후의 첫 검색에도 동의어가 적용된다.
    addScript('data/standards-synonyms.js', () => {
      addScript('data/standards-manifest.js', () => {
        const files = window.STANDARDS_MANIFEST || [];
        if (!files.length) { finish(); return; }
        let done = 0;
        for (const f of files) addScript('data/' + f, () => { if (++done === files.length) finish(); });
      }, () => { loading = false; meta.textContent = '색인 목록(data/standards-manifest.js)을 불러오지 못했습니다.'; });
    });
  }

  document.addEventListener('tool-tab-change', (e) => { if (e.detail === 'standards-search') load(); });
  // 새로고침으로 이 탭이 바로 열린 경우에는 탭 전환 신호가 이 스크립트보다 먼저 지나가므로 직접 불러온다.
  if (panel.style.display !== 'none') load();
})();

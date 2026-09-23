/* 설계기준 및 표준품셈 검색 탭 공용 모듈.
   결과 문장은 원문 그대로 보여주고, 긴 조항은 검색어가 있는 줄부터 발췌하거나 접는다. */
(() => {
  'use strict';
  const PAGE_SIZE = 50;
  const TABLE_ROWS = 10;      // 접힌 표에 보여 줄 행 수
  const EXCERPT_LEAD = 200;
  const EXCERPT_LEN = 2400;

  const norm = (s) => String(s || '').replace(/\s+/g, '');
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function initSearchTab(config) {
    const input = document.getElementById(config.inputId);
    const filters = document.getElementById(config.filtersId);
    const meta = document.getElementById(config.metaId);
    const list = document.getElementById(config.resultsId);
    const panel = document.querySelector(`.tab-panel[data-tab="${config.tabId}"]`);
    if (!input || !filters || !meta || !list || !panel) return;

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
      const text = norm(config.getText(chunk)), title = norm(chunk.path_str || chunk.clause_title);
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
      if (q.phrase && (text.includes(q.phrase) || title.includes(q.phrase))) s += 5000;
      else if (groupsPos.length > 1) s += 1000 / (closestSpan(groupsPos) + 1);
      if (doc.revision_date) s += 0.5;
      if (doc.document_role === 'revision_comparison' || doc.document_role === 'review_draft_label') s -= 5;
      return s;
    }

    function highlighter(q) {
      const words = [...new Set(q.groups.flat().map(norm).filter(Boolean))].sort((a, b) => b.length - a.length);
      if (!words.length) return null;
      return new RegExp(words.map((w) => [...w].map(escapeRe).join('\\s*')).join('|'), 'gi');
    }

    function card(item, i, rx) {
      const { chunk, doc } = item;
      const body = config.renderBody(chunk, rx, false);
      let badges = '';
      if (doc.document_role === 'revision_comparison') badges += '<span class="std-badge old">신구대비표</span>';
      if (doc.document_role === 'review_draft_label') badges += '<span class="std-badge draft">안</span>';
      if (!doc.revision_date && doc.edition_date_hint) badges += '<span class="std-badge">날짜 추정</span>';
      const file = (doc.path || '').split(/[\\/]/).pop();
      return '<article class="std-card" data-i="' + i + '" data-key="' + esc(item.key) + '">' +
        '<div class="std-card-header"><div>' +
          '<div class="std-card-meta">' +
            (doc.code ? '<span>' + esc(doc.code) + '</span><span aria-hidden="true">|</span>' : '') +
            '<span>' + esc(doc.revision_date || doc.edition_date_hint || '날짜 미상') + '</span>' + badges + '</div>' +
          '<div class="std-card-title">' + esc(doc.title || '') + '</div>' +
        '</div></div>' +
        '<div class="std-card-body">' +
          '<div class="std-card-path">' + esc(chunk.path_str || chunk.clause_title || '') + '</div>' +
          body.html +
          '<button type="button" class="std-full-toggle" aria-expanded="false">' + (body.cut ? (config.tabId === 'pumsem' ? '펼쳐 보기' : '조항 전체 보기') : '펼쳐 보기') + '</button>' +
        '</div>' +
        '<div class="std-card-footer">' +
          '<span>출처 - <span title="' + esc(doc.path || '') + '">' + esc(file) + '</span>' +
          (chunk.page ? ' · ' + esc(String(chunk.page)) + '쪽' : '') +
          // 품셈은 PDF 쪽과 책에 인쇄된 쪽이 다르다(PDF 401쪽 = 책 345쪽). 둘 다 보여준다.
          (chunk.book_page ? '(책 ' + esc(String(chunk.book_page)) + '쪽)' : '') + '</span>' +
        '</div>' +
      '</article>';
    }

    function draw() {
      const rx = query ? highlighter(query) : null;
      let html = results.slice(0, limit).map((item, i) => card(item, i, rx)).join('');
      if (results.length > limit) html += '<button type="button" id="' + config.inputId + 'LoadMore" class="std-load-more">더 보기 (' + (results.length - limit).toLocaleString() + '건 남음)</button>';
      list.innerHTML = html || '<p class="empty">결과가 없습니다.</p>';
      
      list.querySelectorAll('.std-card').forEach((el) => {
        const btn = el.querySelector('.std-full-toggle');
        const item = results[Number(el.dataset.i)];
        const body = config.renderBody(item.chunk, rx, false);
        // For standards, we hide if scrollHeight <= clientHeight. For pumsem, we hide if not cut.
        if (config.tabId === 'pumsem') {
          if (!body.cut) btn.hidden = true;
        } else {
          const t = el.querySelector('.std-card-text');
          if (btn && !body.cut && t && t.scrollHeight <= t.clientHeight + 2) btn.hidden = true;
        }
      });
    }

    function search() {
      if (!loaded) { meta.textContent = '색인 데이터를 불러오는 중...'; return; }
      synonyms = (window.STANDARDS_SYNONYMS && window.STANDARDS_SYNONYMS.synonym_groups) || [];
      const raw = input.value.trim();
      limit = PAGE_SIZE;
      if (!raw) {
        results = []; query = null; list.innerHTML = '<p class="empty">검색어를 입력하세요.</p>';
        const total = (window[config.globalIndex] || []).reduce((n, d) => n + (d.chunks || []).length, 0);
        meta.textContent = '총 ' + total.toLocaleString() + '개 조항 검색 가능';
        return;
      }
      query = parseQuery(raw);
      results = [];
      for (const doc of window[config.globalIndex] || []) {
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
      if (e.target.closest('#' + config.inputId + 'LoadMore')) { limit += PAGE_SIZE; draw(); return; }
      // 표 전체 보기: 접어 둔 나머지 행을 편다.
      const more = e.target.closest('.std-table-more');
      if (more) {
        const wrap = more.closest('.std-table-wrap');
        wrap.classList.remove('folded');
        wrap.querySelectorAll('tr.rest').forEach((tr) => { tr.hidden = false; });
        more.remove();
        return;
      }
      const toggle = e.target.closest('.std-full-toggle');
      if (!toggle) return;
      const el = toggle.closest('.std-card');
      const item = results[Number(el.dataset.i)];
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      const rx = query ? highlighter(query) : null;
      
      const newBody = config.renderBody(item.chunk, rx, open);
      const textContainer = el.querySelector('.std-card-text') || el.querySelector('.pumsem-blocks');
      
      if (textContainer) {
        textContainer.outerHTML = newBody.html;
      }
      
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '접기' : (newBody.cut ? (config.tabId === 'pumsem' ? '펼쳐 보기' : '조항 전체 보기') : '펼쳐 보기');
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
      
      const loadIndex = () => {
        const files = window[config.manifest] || [];
        if (!files.length) { finish(); return; }
        let done = 0;
        for (const f of files) addScript('data/' + f, () => { if (++done === files.length) finish(); });
      };

      if (config.tabId === 'standards-search') {
        addScript('data/standards-synonyms.js', () => {
          addScript('data/standards-manifest.js', loadIndex, () => { loading = false; meta.textContent = '색인 목록을 불러오지 못했습니다.'; });
        });
      } else {
        // Pumsem doesn't use synonyms, just load manifest
        addScript('data/pumsem-manifest.js', loadIndex, () => { loading = false; meta.textContent = '색인 목록을 불러오지 못했습니다.'; });
      }
    }

    const observer = new MutationObserver(() => {
      if (panel.style.display !== 'none') load();
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['style'] });
    if (panel.style.display !== 'none') load();
  }

  // Util functions for rendering
  function esc(text) {
    return String(text).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
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
    let start = text.lastIndexOf('\n', at) + 1;
    if (at - start > EXCERPT_LEAD) {
      const s = lastSentenceEnd(text, Math.max(start, at - EXCERPT_LEAD * 3), at);
      start = s > 0 ? s : at - EXCERPT_LEAD;
    }
    while (start < at && /\s/.test(text[start])) start++;
    let end = Math.min(text.length, start + EXCERPT_LEN);
    if (end < text.length) {
      const para = text.lastIndexOf('\n', end);
      const sent = lastSentenceEnd(text, start + EXCERPT_LEN / 2, end);
      if (para > start + EXCERPT_LEN / 2) end = para;
      else if (sent > 0) end = sent;
    }
    return { text: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''), cut: true };
  }

  // Initialize Standards Search Tab
  initSearchTab({
    tabId: 'standards-search',
    inputId: 'stdSearchQ',
    filtersId: 'stdFilters',
    metaId: 'stdMeta',
    resultsId: 'stdResults',
    globalIndex: 'STANDARDS_INDEX',
    manifest: 'STANDARDS_MANIFEST',
    getText: (chunk) => chunk.text || '',
    renderBody: (chunk, rx, open) => {
      const text = (chunk.text || '').replace(/\n/g, ' ');
      const ex = open ? { text, cut: false } : excerpt(text, rx);
      return {
        html: '<p class="std-card-text ' + (open ? 'expanded' : '') + '">' + highlight(ex.text, rx) + '</p>',
        cut: ex.cut || text.length > EXCERPT_LEN
      };
    }
  });

  // Initialize Pumsem Tab
  initSearchTab({
    tabId: 'pumsem',
    inputId: 'pumsemQ',
    filtersId: 'pumsemFilters',
    metaId: 'pumsemMeta',
    resultsId: 'pumsemResults',
    globalIndex: 'PUMSEM_INDEX',
    manifest: 'PUMSEM_MANIFEST',
    getText: (chunk) => {
      return (chunk.blocks || []).map(b => {
        if (b.type === 'text') return b.text;
        const tbl = b.table || b;
        return tbl.rows ? tbl.rows.flat().join(' ') : '';
      }).join('\n');
    },
    renderBody: (chunk, rx, open) => {
      let html = '<div class="pumsem-blocks ' + (open ? 'expanded' : '') + '">';
      let blockCount = 0;
      let cut = false;
      const all = chunk.blocks || [];
      // 접힌 카드는 검색어가 있는 블록부터 보여준다(설계기준 발췌와 같은 규칙).
      // 표가 여러 개인 항목에서 첫 표만 보이고 정작 찾는 표는 안 보이는 일을 막는다.
      let from = 0;
      if (!open && rx) {
        // 검색어를 가장 많이(서로 다른 낱말 기준) 담은 블록부터 보여준다.
        // '원형철근 할증률'이면 '할증률'만 있는 머리글이 아니라 원형철근이 있는 표에서 시작한다.
        const hits = (b) => {
          const text = b.type === 'text' ? (b.text || '')
            : ((b.table || b).rows || []).map((r) => r.join(' ')).join(' ');
          rx.lastIndex = 0;
          const found = new Set();
          for (let m; (m = rx.exec(text));) { if (!m[0]) { rx.lastIndex++; continue; } found.add(norm(m[0])); }
          return found.size;
        };
        let best = 0, bestAt = 0;
        all.forEach((b, i) => { const n = hits(b); if (n > best) { best = n; bestAt = i; } });
        from = bestAt;
      }
      const blocks = all.slice(from);
      if (from > 0) { html += '<p class="std-card-text">…</p>'; cut = true; }
      for (const b of blocks) {
        if (!open && blockCount >= 2) { cut = true; break; }
        if (b.type === 'text') {
          html += '<p class="std-card-text">' + highlight(b.text, rx) + '</p>';
          blockCount++;
        } else if (b.type === 'table') {
          html += renderTable(b.table || b, rx);
          blockCount++;
        }
      }
      html += '</div>';
      return { html, cut: cut || (!open && all.length > 2) };
    }
  });

  // 품셈 표 그리기. 한 칸에 여러 줄이 겹쳐 들어온 행은 줄 수가 맞으면 행으로 나누고,
  // 빈 행·빈 열은 빼서 표를 좁게 만든다. 숫자 칸은 오른쪽에 붙여 자릿수를 맞춘다.
  function renderTable(tbl, rx) {
    let rows = (tbl.rows || []).map((r) => r.map((c) => String(c == null ? '' : c)));
    // 머리 행만 있고 본문이 없는 표(원문에서 표가 쪽 경계로 잘린 경우)는 머리 행을 본문처럼 보여준다.
    const header = Math.min(tbl.header_rows || 0, Math.max(0, rows.length - 1));
    const body = rows.slice(header).flatMap((row) => {
      const counts = row.filter((c) => c.trim()).map((c) => c.split('\n').length);
      const n = counts.length ? Math.max(...counts) : 1;
      if (n < 2 || !counts.every((x) => x === n)) return [row];
      return Array.from({ length: n }, (_, i) => row.map((c) => (c.trim() ? c.split('\n')[i] : '')));
    });
    rows = rows.slice(0, header).concat(body);
    const width = Math.max(0, ...rows.map((r) => r.length));
    const keep = [];
    for (let c = 0; c < width; c++) if (rows.some((r) => (r[c] || '').trim())) keep.push(c);
    const out = rows.filter((r) => r.some((c) => c.trim()));
    if (!out.length || !keep.length) return '';

    const isNum = (s) => /^[\d.,%~\-\s]*\d[\d.,%~\-\s]*$/.test(s.trim());
    const cell = (text, tag, numeric) =>
      '<' + tag + (numeric ? ' class="num"' : '') + '>' +
      (rx ? highlight(text, rx) : esc(text)).replace(/\n/g, '<br>') +
      '</' + tag + '>';

    // 검색어가 첫 열(항목 이름)과 맞는 행은 옅은 배경으로 짚어 준다. 너무 많이 맞으면(6행 이상) 짚지 않는다.
    const hit = [];
    if (rx) {
      for (let r = header; r < out.length; r++) {
        rx.lastIndex = 0;
        if (rx.test(out[r][keep[0]] || '')) hit.push(r);
      }
    }
    const mark = hit.length && hit.length <= 5 ? new Set(hit) : new Set();

    // 행이 많은 표는 앞 10행만 보이고 나머지는 '표 전체 보기'로 편다.
    // 검색어와 맞는 행은 뒤쪽에 있어도 접힌 상태에서 보이게 앞으로 끌어올리지 않고, 그 행까지 펼쳐 둔다.
    const bodyCount = out.length - header;
    const lastHit = mark.size ? Math.max(...mark) : -1;
    const shown = bodyCount > TABLE_ROWS + 3 ? Math.max(header + TABLE_ROWS, lastHit + 1) : out.length;
    const hidden = out.length - shown;

    let html = '<div class="std-table-wrap' + (hidden > 0 ? ' folded' : '') + '"><table class="std-table">';
    if (header) {
      html += '<thead>';
      for (let r = 0; r < header; r++) {
        html += '<tr>' + keep.map((c) => cell(out[r][c] || '', 'th', false)).join('') + '</tr>';
      }
      html += '</thead>';
    }
    html += '<tbody>';
    for (let r = header; r < out.length; r++) {
      const cls = [mark.has(r) ? 'hit' : '', r >= shown ? 'rest' : ''].filter(Boolean).join(' ');
      html += '<tr' + (cls ? ' class="' + cls + '"' : '') + (r >= shown ? ' hidden' : '') + '>' +
        keep.map((c) => cell(out[r][c] || '', 'td', isNum(out[r][c] || ''))).join('') + '</tr>';
    }
    html += '</tbody></table>';
    if (hidden > 0) {
      html += '<button type="button" class="std-table-more">표 전체 보기 (' + bodyCount + '행)</button>';
    }
    return html + '</div>';
  }


})();

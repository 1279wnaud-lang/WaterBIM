// Shared page renderer: produces {title, description, styleCss, bodyHtml}.
// Design language (2026-08-12, v3 - ui-ux-pro-max "Flat Design" system): the CRT
// terminal reskin was reported unreadable for a dense data-lookup tool, so this
// reverts to a clean, readable, single-blue-mood direction (reference: a clean
// campus-AI-platform landing page tone/layout) - white/near-white surfaces, ONE
// blue accent (no second decorative hue), soft cards, IBM Plex Sans/Mono for a
// pairing with more character than the Inter/Poppins default everyone reaches for.
const fs = require('fs');
const path = require('path');

function buildPage() {
  const DATA = path.join(__dirname, '..', 'data');
  const entries = JSON.parse(fs.readFileSync(path.join(DATA, 'search-index.json'), 'utf8'));
  const bimColorsRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'bim-colors-raw.json'), 'utf8'));
  const dictDataRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'wbs-dictionary.json'), 'utf8'));

  // Raw dictionary "category" values are free-text combos ("토목·상하수도", "건설/토목" 등) -
  // 215 distinct raw strings across 97 underlying domain tokens, unusable as filter chips as-is.
  // Consolidate into ~11 top-level domains by mapping each raw token (split on · or /) to a
  // canonical bucket, keeping the first-matching token's bucket as the entry's primary category -
  // this groups by the domains already present in the data rather than inventing new meaning.
  const CATEGORY_MAP = {
    토목: '토목', 도로: '토목', 터널: '토목', 지질: '토목', 지반: '토목', 측량: '토목', 하천: '토목',
    토공: '토목', 철근: '토목', 기초: '토목', 지중화: '토목', 교통: '토목', 수자원: '토목', 구조: '토목',
    건축: '건축', 마감: '건축', 도장: '건축', 조적: '건축', 외장: '건축', 미장: '건축', 금속: '건축',
    재료: '건축', 건축재료: '건축', 가설: '건축', 가설공사: '건축',
    기계: '기계·설비', 기계설비: '기계·설비', 배관: '기계·설비', 공조: '기계·설비', 냉난방: '기계·설비',
    계측: '기계·설비', 동력: '기계·설비', 운반: '기계·설비', 설비: '기계·설비',
    건축설비: '기계·설비', 플랜트: '기계·설비',
    전기: '전기·제어', 전기설비: '전기·제어', 조명: '전기·제어', 발전: '전기·제어', 수배전: '전기·제어',
    배선: '전기·제어', 자동제어: '전기·제어', 제어: '전기·제어', 제어설비: '전기·제어',
    상하수도: '상하수도·환경', 수처리: '상하수도·환경', 수처리설비: '상하수도·환경', 위생설비: '상하수도·환경',
    환경: '상하수도·환경', 환경기계: '상하수도·환경',
    통신: '통신', 정보통신: '통신', 통신설비: '통신', 방범: '통신', 보안: '통신', 전산: '통신', 전자: '통신',
    조경: '조경',
    안전: '안전·품질', 소방: '안전·품질', 소방설비: '안전·품질', 점검: '안전·품질', 품질: '안전·품질', 품질관리: '안전·품질',
    사업관리: '사업관리·행정', 관리: '사업관리·행정', 유지관리: '사업관리·행정', 행정: '사업관리·행정',
    공무: '사업관리·행정', 견적: '사업관리·행정', 내역: '사업관리·행정', 계약: '사업관리·행정',
    설계: '사업관리·행정', 시공: '사업관리·행정', 규정: '사업관리·행정', 재무: '사업관리·행정',
    문서: '사업관리·행정', 정보: '사업관리·행정', 계획: '사업관리·행정', 자재: '사업관리·행정',
    부품: '사업관리·행정', 공사명: '사업관리·행정',
    BIM: 'BIM',
    좌표: '측량/좌표', 좌표계: '측량/좌표', 측지: '측량/좌표', 측량: '측량/좌표',
    공통: '공통', 일반: '공통', 건설: '공통', 건설일반: '공통',
  };
  function normalizeCategory(raw) {
    const tokens = (raw || '').split(/[·/]/).map((t) => t.trim()).filter(Boolean);
    for (const t of tokens) {
      const key = t.replace(/\s+일반$/, '').trim();
      if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
      if (CATEGORY_MAP[t]) return CATEGORY_MAP[t];
    }
    return '기타';
  }
  const dictData = dictDataRaw.map((e) => ({ ...e, categoryGroup: normalizeCategory(e.category) }));

  // One blue mood, per request - all real sources share the accent blue; "참고" (uncertain/
  // reference-only source) keeps a distinct amber because that's a functional data-quality
  // signal (semantic color), not a second decorative brand hue.
  // Lv1->Lv7 badge color as one continuous blue gradient, darkest at Lv1 to lightest at
  // Lv7 (HSL 221/78%, lightness 26%->80% in 6 even steps). Badge text flips from white to
  // a dark navy ink partway through so every stop still clears WCAG AA (>=4.5:1) - verified
  // per-stop rather than assumed.
  const SOURCE_META = {
    'WBS-Lv1': { group: 'K-water WBS (부속서-2)', label: 'Lv1 발주분야', color: '#0F2F76', ink: '#FFFFFF' },
    'WBS-Lv2': { group: 'K-water WBS (부속서-2)', label: 'Lv2 시설대분류', color: '#14409F', ink: '#FFFFFF' },
    'WBS-Lv3': { group: 'K-water WBS (부속서-2)', label: 'Lv3 시설중분류', color: '#1950C8', ink: '#FFFFFF' },
    'WBS-시설(Lv4)': { group: 'K-water WBS (부속서-2)', label: 'Lv4 시설소분류', color: '#2A65E5', ink: '#FFFFFF' },
    'WBS-Lv5': { group: 'K-water WBS (부속서-2)', label: 'Lv5 공종대분류', color: '#5382EA', ink: '#0E2555' },
    'WBS-공종(Lv6)': { group: 'K-water WBS (부속서-2)', label: 'Lv6 공종중분류', color: '#7BA0EF', ink: '#0E2555' },
    'WBS-기타(참고, Lv7류)': { group: 'K-water WBS (부속서-2)', label: 'Lv7 공종소분류', color: '#A4BDF4', ink: '#0E2555' },
    'WBS-기타(참고)': { group: 'K-water WBS (부속서-2)', label: '참고', color: '#D97706', ink: '#FFFFFF' },
    Pset: { group: 'K-water 속성정보세트 (부속서-7)', label: 'Pset', color: '#0F2F76', ink: '#FFFFFF' },
  };

  const styleCss = `
  :root {
    --bg: #F6F8FC; --panel: #FFFFFF; --ink: #16202E; --muted: #64748B;
    --border: #E3E8F0; --accent: #2F6FED; --accent-ink: #FFFFFF; --amber: #D97706;
    --code-bg: #F0F4FB; --mark-bg: #FEF3C7; --mark-ink: #92400E;
    --shadow: 0 1px 2px rgba(16,24,40,.04), 0 4px 14px rgba(16,24,40,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0E1420; --panel: #161D2C; --ink: #E7ECF5; --muted: #8B97AC;
      --border: #2A3550; --accent: #5B8DEF; --accent-ink: #0B1220; --amber: #F5A623;
      --code-bg: #1B2436; --mark-bg: #3A2E0E; --mark-ink: #F6D97A;
      --shadow: 0 1px 2px rgba(0,0,0,.3), 0 4px 14px rgba(0,0,0,.35); }
  }
  :root[data-theme="dark"] { --bg: #0E1420; --panel: #161D2C; --ink: #E7ECF5; --muted: #8B97AC;
    --border: #2A3550; --accent: #5B8DEF; --accent-ink: #0B1220; --amber: #F5A623;
    --code-bg: #1B2436; --mark-bg: #3A2E0E; --mark-ink: #F6D97A;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 4px 14px rgba(0,0,0,.35); }
  :root[data-theme="light"] { --bg: #F6F8FC; --panel: #FFFFFF; --ink: #16202E; --muted: #64748B;
    --border: #E3E8F0; --accent: #2F6FED; --accent-ink: #FFFFFF; --amber: #D97706;
    --code-bg: #F0F4FB; --mark-bg: #FEF3C7; --mark-ink: #92400E;
    --shadow: 0 1px 2px rgba(16,24,40,.04), 0 4px 14px rgba(16,24,40,.06); }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--accent); color: var(--accent-ink); }

  a { color: var(--accent); }

  .app { display: flex; align-items: stretch; min-height: 100vh; }
  .sidebar {
    width: 220px; flex: none; background: var(--panel); border-right: 1px solid var(--border);
    overflow: hidden; white-space: nowrap; transition: width .16s ease, opacity .16s ease;
    position: sticky; top: 0; align-self: flex-start; height: 100vh; overflow-y: auto;
  }
  .sidebar.collapsed { width: 0; border-right: none; opacity: 0; }
  .sidebar-head { padding: 16px 18px; border-bottom: 1px solid var(--border); }
  .sidebar-title { font-size: 13px; font-weight: 700; letter-spacing: -.01em; }
  .nav-list { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer;
    font-size: 13px; font-weight: 600; color: var(--muted); border-radius: 8px;
  }
  .nav-item svg { width: 16px; height: 16px; flex: none; }
  .nav-item:hover { color: var(--ink); background: var(--code-bg); }
  .nav-item.active { color: var(--accent-ink); background: var(--accent); }

  .main-area { flex: 1; min-width: 0; }
  .header-top { display: flex; align-items: flex-start; gap: 12px; }
  .header-main { flex: 1; min-width: 0; }
  .sidebar-toggle {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--panel); color: var(--muted); cursor: pointer; margin-top: 1px;
  }
  .sidebar-toggle:hover { background: var(--code-bg); color: var(--ink); }
  .sidebar-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .sidebar-toggle svg { width: 16px; height: 16px; }

  header {
    position: sticky; top: 0; z-index: 10;
    background: color-mix(in srgb, var(--panel) 94%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--border);
    padding: 18px 22px 14px;
  }
  .eyebrow {
    display: inline-block;
    font-size: 11px; font-weight: 600; letter-spacing: .06em;
    color: var(--accent); margin: 0 0 6px; padding: 2px 10px; border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  h1 {
    font-size: 20px; margin: 0 0 12px; font-weight: 700; letter-spacing: -.01em; text-wrap: balance;
    color: var(--ink);
  }

  .search-row { position: relative; }
  .search-row input {
    width: 100%; font-size: 15.5px; padding: 12px 14px 12px 38px; border-radius: 10px;
    border: 1.5px solid var(--border); background: var(--panel); color: var(--ink); outline: none;
    font-family: inherit; box-shadow: var(--shadow);
  }
  .search-row input::placeholder { color: var(--muted); }
  .search-row input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  .search-row svg.search-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--muted); pointer-events: none;
  }

  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
    border: 1px solid var(--border); background: var(--panel); color: var(--muted); cursor: pointer; user-select: none;
    transition: opacity .12s;
  }
  .chip .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  .chip.active { color: var(--ink); border-color: color-mix(in srgb, var(--chip-color, var(--accent)) 45%, var(--border)); background: color-mix(in srgb, var(--chip-color, var(--accent)) 10%, var(--panel)); }
  .chip:not(.active) { opacity: .55; }
  .chip:not(.active) .dot { opacity: .5; }

  #meta, #colorMeta, #dictMeta { font-size: 12px; color: var(--muted); margin-top: 10px; font-variant-numeric: tabular-nums; }

  .layout {
    display: grid; grid-template-columns: 1fr; gap: 22px; align-items: start;
    max-width: 1320px; margin: 0; padding: 16px 22px 60px 66px;
  }
  .layout.split { grid-template-columns: 1fr 1fr; max-width: none; }
  main#results { min-width: 0; }
  .tray { display: none; }
  .layout.split .tray { display: block; }
  @media (max-width: 860px) {
    .layout, .layout.split { grid-template-columns: 1fr; max-width: 1320px; }
    .tray { position: static; max-height: none; }
  }

  .card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 15px 17px; margin: 0 0 10px; box-shadow: var(--shadow);
    transition: border-color .15s, box-shadow .15s;
  }
  .card:hover { border-color: color-mix(in srgb, var(--card-color, var(--accent)) 40%, var(--border)); }
  .card-top { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
  .badge {
    font-size: 10.5px; font-weight: 700; letter-spacing: .03em; padding: 2.5px 8px; border-radius: 999px;
    color: var(--accent-ink); white-space: nowrap;
  }
  .code-wrap { display: inline-flex; align-items: center; gap: 3px; }
  .code {
    font-family: 'IBM Plex Mono', ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
    font-weight: 600; font-size: 13.5px; letter-spacing: .01em;
    background: var(--code-bg); color: var(--ink); padding: 1.5px 6px; border-radius: 6px;
  }
  .copy-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border-radius: 6px; border: 1px solid transparent;
    background: transparent; color: var(--muted); cursor: pointer;
  }
  .copy-btn:hover { background: var(--code-bg); color: var(--accent); border-color: var(--border); }
  .copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .copy-btn.copied { color: var(--accent); }
  .copy-btn svg { width: 13px; height: 13px; pointer-events: none; }
  .name { font-size: 14.5px; font-weight: 600; }
  .breadcrumb { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
  .desc { font-size: 13px; margin-top: 7px; white-space: pre-wrap; line-height: 1.55; }
  .extra { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
  .tag {
    font-size: 11px; background: var(--code-bg); color: var(--muted);
    padding: 3px 8px; border-radius: 6px; font-variant-numeric: tabular-nums;
  }
  .empty { color: var(--muted); text-align: center; padding: 50px 0; font-size: 13.5px; }
  mark { background: var(--mark-bg); color: var(--mark-ink); border-radius: 3px; padding: 0 1px; }

  kbd {
    font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 11px; background: var(--code-bg);
    border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px; padding: 1px 5px; color: var(--muted);
  }

  .add-btn {
    display: inline-flex; align-items: center; gap: 4px;
    height: 24px; padding: 0 9px; border-radius: 6px; border: 1px solid transparent;
    background: var(--accent); color: var(--accent-ink); cursor: pointer; font-size: 11.5px; font-weight: 700;
  }
  .add-btn:hover { filter: brightness(1.08); }
  .add-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .add-btn.added { background: var(--amber); }
  .add-btn svg { width: 13px; height: 13px; pointer-events: none; }

  .route-btn {
    display: inline-flex; align-items: center; gap: 4px;
    height: 24px; padding: 0 9px; border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
    background: color-mix(in srgb, var(--accent) 8%, var(--panel)); color: var(--accent);
    cursor: pointer; font-size: 11.5px; font-weight: 700;
  }
  .route-btn:hover { background: color-mix(in srgb, var(--accent) 18%, var(--panel)); }
  .route-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .route-btn svg { width: 13px; height: 13px; pointer-events: none; }

  .route-panel {
    margin-top: 10px; padding: 10px 12px; border-radius: 10px;
    background: var(--code-bg); border: 1px solid var(--border);
  }
  .route-hint { font-size: 11.5px; color: var(--muted); margin: 0 0 10px; line-height: 1.5; }
  .route-row {
    display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .route-row:last-child { border-bottom: none; }
  .route-group { width: 76px; flex: none; font-size: 12.5px; font-weight: 700; color: var(--ink); }
  .route-chips { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
  .route-chip {
    display: inline-flex; align-items: baseline; gap: 4px;
    border-radius: 6px; padding: 3px 7px; font-size: 11.5px; line-height: 1.4;
    background: color-mix(in srgb, var(--chip-color, var(--accent)) 12%, var(--panel));
    border: 1px solid color-mix(in srgb, var(--chip-color, var(--accent)) 40%, var(--border));
  }
  .route-chip b {
    font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace;
    font-weight: 700; color: var(--ink); font-size: 12px;
  }
  .route-chip-label { font-size: 9.5px; font-weight: 700; letter-spacing: .03em; color: var(--muted); }
  .route-chip--empty {
    background: transparent; border: 1px dashed var(--border); color: var(--muted); font-style: italic;
  }
  .route-apply {
    flex: none; font-size: 11.5px; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--panel); color: var(--ink); cursor: pointer; margin-left: auto;
  }
  .route-apply:hover { border-color: var(--accent); color: var(--accent); }

  .tray {
    position: sticky; top: var(--tray-top, 90px);
    background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
    padding: 20px 24px 24px; max-height: calc(100vh - var(--tray-top, 90px) - 20px); overflow-y: auto;
    box-shadow: var(--shadow);
  }
  .tray-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .tray-title { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: var(--ink); }
  .tray-clear { font-size: 12.5px; color: var(--muted); background: none; border: none; cursor: pointer; padding: 2px 4px; text-decoration: underline; }
  .tray-clear:hover { color: var(--ink); }

  .slot-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 16px; }
  .slot-group-title {
    font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1.5px solid var(--accent);
  }
  .tray-slots { display: flex; flex-direction: column; }
  .slot-row { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--border); }
  .slot-row:last-child { border-bottom: none; }
  .slot-row-label { width: 108px; flex: none; font-size: 12px; color: var(--muted); line-height: 1.35; }
  .slot-row-value { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
  .slot-dot { width: 9px; height: 9px; border-radius: 2px; flex: none; }
  .slot-empty-text { font-size: 13px; color: var(--border); }
  .slot-code {
    font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace;
    font-size: 13.5px; font-weight: 700; letter-spacing: .01em; flex: none;
    background: var(--code-bg); padding: 2px 7px; border-radius: 4px;
  }
  .slot-name {
    font-size: 12.5px; color: var(--muted); min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .slot-section {
    width: 34px; text-align: center; font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 12px;
    border: 1px dashed var(--accent); border-radius: 4px; background: var(--bg); color: var(--accent);
    padding: 2px 3px; flex: none; font-weight: 700;
  }
  .slot-remove {
    display: inline-flex; align-items: center; justify-content: center; margin-left: auto;
    width: 20px; height: 20px; border-radius: 4px; border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 0; flex: none;
  }
  .slot-remove:hover { background: var(--border); color: var(--ink); }
  .slot-remove svg { width: 11px; height: 11px; }

  @media (max-width: 1280px) { .slot-groups { grid-template-columns: 1fr; gap: 4px; } }

  .tray-row2 { display: flex; align-items: center; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
  .tray-preview {
    font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 15px; font-weight: 700;
    background: var(--code-bg); border-radius: 7px; padding: 10px 14px; flex: 1; min-width: 0;
    overflow-x: auto; white-space: nowrap;
  }
  .tray-copy {
    display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
    background: var(--accent); color: var(--accent-ink); border: none; border-radius: 7px; padding: 10px 16px; cursor: pointer; flex: none;
  }
  .tray-copy svg { width: 14px; height: 14px; }
  .tray-copy.copied { background: var(--amber); }
  .tray-hint { font-size: 11.5px; color: var(--muted); margin-top: 12px; line-height: 1.55; }

  /* --- 색상기준 탭: 정육면체(true 3D cube) 스와치 그리드 --- */
  .color-groups { max-width: 1200px; margin: 0; padding: 18px 22px 60px 66px; }
  .color-group { margin-bottom: 30px; }
  .color-group-title {
    font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 14px; padding-bottom: 7px; border-bottom: 1.5px solid var(--border);
  }
  .color-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 14px; }
  .color-tile {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px 8px 12px;
    box-shadow: var(--shadow);
  }
  .color-tile-name { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.3; }
  .color-tile-rgb-row { display: flex; align-items: center; gap: 3px; }

  /* --- 용어사전 탭 --- */
  .dict-list { max-width: 1320px; margin: 0; padding: 18px 22px 60px 66px; }
  .dict-card-top { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
  .dict-word { font-size: 16px; }
  .dict-explain {
    font-size: 13px; margin-top: 9px; padding: 9px 12px; border-radius: 10px;
    background: var(--code-bg); color: var(--ink); line-height: 1.55;
  }
  .dict-explain strong { color: var(--accent); margin-right: 4px; }
  .color-tile-rgb { font-family: 'IBM Plex Mono', ui-monospace, Consolas, monospace; font-size: 11px; color: var(--muted); }

  .cube-scene { width: 58px; height: 58px; margin: 6px auto 14px; perspective: 320px; }
  .cube {
    position: relative; width: 100%; height: 100%; transform-style: preserve-3d;
    transform: rotateX(-28deg) rotateY(-38deg);
  }
  .cube-face { position: absolute; width: 58px; height: 58px; border: 1px solid rgba(0,0,0,.14); }
  .cube-face.front { transform: translateZ(29px); }
  .cube-face.top { transform: rotateX(90deg) translateZ(29px); }
  .cube-face.side { transform: rotateY(90deg) translateZ(29px); }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `;

  const SEARCH_ICON = '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>';
  const TOGGLE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
  const NAV_SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
  const NAV_PALETTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c1.7 0 3.1-1.4 3.1-3.1C20.5 6.6 16.7 2 12 2Z"></path><circle cx="7" cy="10" r="1.2"></circle><circle cx="12" cy="7" r="1.2"></circle><circle cx="16.5" cy="10" r="1.2"></circle></svg>';
  const NAV_DICT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>';

  const bodyHtml = `<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-head"><span class="sidebar-title">K-water BIM 도구</span></div>
    <nav class="nav-list" id="navList"></nav>
  </aside>
  <div class="main-area">
    <section class="tab-panel" data-tab="codesearch">
      <header>
        <div class="header-top">
          <button class="sidebar-toggle" type="button" aria-label="사이드바 토글">${TOGGLE_ICON}</button>
          <div class="header-main">
            <p class="eyebrow">BIM Code &amp; Standard Search</p>
            <h1>상하수도 BIM 코드&middot;기준 검색</h1>
            <div class="search-row">
              ${SEARCH_ICON}
              <input id="q" type="text" placeholder="코드, 이름, 설명으로 검색... (예: 게이트밸브, MFA, O0104, FA11)" autofocus autocomplete="off">
            </div>
            <div class="filters" id="filters"></div>
            <div id="meta"></div>
          </div>
        </div>
      </header>
      <div class="layout" id="layout">
        <main id="results"></main>
        <aside class="tray" id="tray">
          <div class="tray-head">
            <span class="tray-title">WBS 코드 조합 (부속서-2 §3.7 방식)</span>
            <button class="tray-clear" id="trayClear" type="button">모두 지우기</button>
          </div>
          <div class="slot-groups" id="traySlots"></div>
          <div class="tray-row2">
            <div class="tray-preview" id="trayPreview"></div>
            <button class="tray-copy" id="trayCopy" type="button"></button>
          </div>
          <p class="tray-hint">WBS 코드 카드의 <strong>+</strong> 버튼으로 해당 레벨 칸에 담기 · Lv4(시설소분류)의 끝 2자리는 구간번호이며 직접 편집 가능 · Lv7(참고)은 예시 코드이므로 실제 사업 코드부여기준 확인 필요</p>
        </aside>
      </div>
    </section>
    <section class="tab-panel" data-tab="colors" style="display:none">
      <header>
        <div class="header-top">
          <button class="sidebar-toggle" type="button" aria-label="사이드바 토글">${TOGGLE_ICON}</button>
          <div class="header-main">
            <p class="eyebrow">BIM Model Color &amp; Material Standards</p>
            <h1>상하수도 BIM 모델 색상&middot;재질 기준</h1>
            <div class="search-row">
              ${SEARCH_ICON}
              <input id="colorQ" type="text" placeholder="시설명으로 찾기... (예: 취수구, 정수지)" autocomplete="off">
            </div>
            <div class="filters" id="colorFilters"></div>
            <div id="colorMeta"></div>
          </div>
        </div>
      </header>
      <div class="color-groups" id="colorGroups"></div>
    </section>
    <section class="tab-panel" data-tab="dictionary" style="display:none">
      <header>
        <div class="header-top">
          <button class="sidebar-toggle" type="button" aria-label="사이드바 토글">${TOGGLE_ICON}</button>
          <div class="header-main">
            <p class="eyebrow">Dictionary</p>
            <h1>상하수도 BIM 용어 사전</h1>
            <div class="search-row">
              ${SEARCH_ICON}
              <input id="dictQ" type="text" placeholder="단어, 뜻으로 찾기... (예: 가압장, 밸브)" autocomplete="off">
            </div>
            <div class="filters" id="dictFilters"></div>
            <div id="dictMeta"></div>
          </div>
        </div>
      </header>
      <div class="dict-list" id="dictList"></div>
    </section>
  </div>
</div>
<script>
const SOURCE_META = ${JSON.stringify(SOURCE_META)};
const SOURCES = Object.keys(SOURCE_META);
const DATA = ${JSON.stringify(entries)};
const COLOR_DATA = ${JSON.stringify(bimColorsRaw)};
const DICT_DATA = ${JSON.stringify(dictData)};
const DATA_BY_ID = {};
for (const e of DATA) DATA_BY_ID[e.id] = e;

// Which WBS 조합 슬롯(L1~L7) a search-result source belongs to (부속서-2 §3.7 조합 순서).
const WBS_LEVEL = {
  'WBS-Lv1': 'L1', 'WBS-Lv2': 'L2', 'WBS-Lv3': 'L3', 'WBS-시설(Lv4)': 'L4',
  'WBS-Lv5': 'L5', 'WBS-공종(Lv6)': 'L6', 'WBS-기타(참고, Lv7류)': 'L7',
};
const LEVEL_SOURCE = {};
for (const src in WBS_LEVEL) LEVEL_SOURCE[WBS_LEVEL[src]] = src;
const SLOT_ORDER = [
  ['L1', '발주분야'], ['L2', '시설대분류'], ['L3', '시설중분류'], ['L4', '시설소분류(+구간)'],
  ['L5', '공종대분류'], ['L6', '공종중분류'], ['L7', '공종소분류'],
];
// WBS의 두 독립축(부속서-2): 시설 Lv1-4 / 공종 Lv5-7 - 트레이에서 나란히 배치.
const SLOT_GROUPS = [
  { title: '시설 분류 (Lv1~4)', slots: SLOT_ORDER.slice(0, 4) },
  { title: '공종 분류 (Lv5~7)', slots: SLOT_ORDER.slice(4) },
];

// 공종(L5~7) 코드는 시설(L1~4)과 독립적으로 정해져 있고, 어느 시설에 쓰이든
// L1~L3 접두부만 바뀐다 - CodeSearch 자체 WBS 데이터로 교차 검증된 6개 시설군 경로.
// (L4는 시설군 안에서도 여러 개라 여기서 자동으로 못 좁혀서 사용자가 직접 검색해서 채움)
const FACILITY_ROUTES = [
  { group: '공통시설', l2: 'F00', l2Name: '공통시설', l3: '1', l3Name: '공통시설' },
  { group: '취수시설', l2: 'F14', l2Name: '상수도시설', l3: '1411', l3Name: '취수시설' },
  { group: '도수시설', l2: 'F14', l2Name: '상수도시설', l3: '1421', l3Name: '도수시설' },
  { group: '정수시설', l2: 'F14', l2Name: '상수도시설', l3: '1431', l3Name: '정수시설' },
  { group: '송수시설', l2: 'F14', l2Name: '상수도시설', l3: '1441', l3Name: '송수시설' },
  { group: '급배수시설', l2: 'F14', l2Name: '상수도시설', l3: '1451', l3Name: '급배수시설' },
];
// 원본 WBS 목록서의 L7 코드는 Excel 숫자 서식 탓에 앞자리 0이 빠져있음(예: "40")
// - 지침 표기 규칙(4자리)에 맞춰 조합/미리보기에서만 패딩.
function padL7(code) {
  const c = (code || '').trim();
  return /^[0-9]+$/.test(c) && c.length < 4 ? c.padStart(4, '0') : c;
}

function esc(s) {
  return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// --- 사이드바 / 탭 셸 (TABS에 항목만 추가하면 사이드바 목록과 탭 전환이
//     자동으로 늘어나도록 데이터 기반으로 구성) ---
const TABS = [
  { id: 'dictionary', label: '용어사전', icon: '${NAV_DICT_ICON}' },
  { id: 'codesearch', label: '코드서치', icon: '${NAV_SEARCH_ICON}' },
  { id: 'colors', label: '색상기준', icon: '${NAV_PALETTE_ICON}' },
];
const sidebarEl = document.getElementById('sidebar');
const navListEl = document.getElementById('navList');

let activeTab = localStorage.getItem('kwater-tool-active-tab') || TABS[0].id;
if (!TABS.some((t) => t.id === activeTab)) activeTab = TABS[0].id;

function renderNav() {
  navListEl.innerHTML = TABS.map((t) =>
    '<div class="nav-item' + (t.id === activeTab ? ' active' : '') + '" data-tab="' + t.id + '">' +
    (t.icon || '') + '<span>' + esc(t.label) + '</span></div>'
  ).join('');
}
function setActiveTab(id) {
  activeTab = id;
  try { localStorage.setItem('kwater-tool-active-tab', id); } catch (e) {}
  renderNav();
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.style.display = p.getAttribute('data-tab') === id ? '' : 'none';
  });
  updateTrayTop();
}
navListEl.addEventListener('click', (ev) => {
  const item = ev.target.closest('.nav-item');
  if (item) setActiveTab(item.getAttribute('data-tab'));
});
renderNav();
setActiveTab(activeTab);

const SIDEBAR_KEY = 'kwater-tool-sidebar-collapsed';
let sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
function applySidebarState() {
  sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
}
applySidebarState();
document.querySelectorAll('.sidebar-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    try { localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? '1' : '0'); } catch (e) {}
    applySidebarState();
  });
});

const selectedSources = new Set();
const qEl = document.getElementById('q');
const resultsEl = document.getElementById('results');
const metaEl = document.getElementById('meta');
const filtersEl = document.getElementById('filters');

const chipMap = new Map();

// '전체' 칩 (Reset / Show All)
const allChip = document.createElement('div');
allChip.className = 'chip active';
allChip.title = '전체 항목 보기';
allChip.style.setProperty('--chip-color', 'var(--accent)');
allChip.innerHTML = '<span class="dot" style="background:var(--accent)"></span>전체';
allChip.onclick = () => {
  selectedSources.clear();
  updateChipsUI();
  render();
};
filtersEl.appendChild(allChip);

for (const s of SOURCES) {
  const meta = SOURCE_META[s];
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.title = meta.group;
  chip.style.setProperty('--chip-color', meta.color);
  chip.innerHTML = '<span class="dot" style="background:' + meta.color + '"></span>' + esc(meta.label);
  chip.onclick = () => {
    if (selectedSources.has(s)) {
      selectedSources.delete(s);
    } else {
      selectedSources.add(s);
    }
    updateChipsUI();
    render();
  };
  filtersEl.appendChild(chip);
  chipMap.set(s, chip);
}

function updateChipsUI() {
  const isAll = selectedSources.size === 0;
  allChip.classList.toggle('active', isAll);
  for (const [s, chip] of chipMap.entries()) {
    chip.classList.toggle('active', selectedSources.has(s));
  }
}

function highlight(text, terms) {
  let out = esc(text);
  for (const t of terms) {
    if (!t) continue;
    const re = new RegExp('(' + t.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
    out = out.replace(re, '<mark>$1</mark>');
  }
  return out;
}

function score(e, terms) {
  const code = (e.code || '').toLowerCase();
  const name = (e.name || '').toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!t) continue;
    if (code === t) s += 100;
    else if (code.startsWith(t)) s += 60;
    else if (code.includes(t)) s += 30;
    if (name === t) s += 80;
    else if (name.startsWith(t)) s += 50;
    else if (name.includes(t)) s += 25;
    if ((e.description || '').toLowerCase().includes(t)) s += 8;
    if ((e.breadcrumb || []).join(' ').toLowerCase().includes(t)) s += 5;
    if ((e.scope || '').toLowerCase().includes(t)) s += 5;
  }
  return s;
}

function matches(e, terms) {
  const meta = SOURCE_META[e.source] || {};
  const hay = [e.code, e.name, e.description, (e.breadcrumb || []).join(' '), e.scope, e.sheetName, meta.label, meta.group]
    .filter(Boolean).join(' ').toLowerCase();
  return terms.every((t) => !t || hay.includes(t));
}

const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
const ADD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>';
const REMOVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>';
const ROUTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>';

function card(e, terms) {
  const meta = SOURCE_META[e.source] || { label: e.source, color: '#666', group: '' };
  const div = document.createElement('div');
  div.className = 'card';
  div.style.setProperty('--card-color', meta.color);
  const extras = [];
  if (e.format) extras.push('형식: ' + e.format);
  if (e.unit) extras.push('단위: ' + e.unit);
  if (e.example) extras.push('예시: ' + e.example);
  if (e.inputBy) extras.push('입력주체: ' + e.inputBy);
  if (e.scope && e.scope !== '공통') extras.push('적용범위: ' + e.scope);
  if (e.sheetName) extras.push('시트: ' + e.sheetName);
  div.innerHTML = \`
    <div class="card-top">
      <span class="badge" style="background:\${meta.color};color:\${meta.ink || 'var(--accent-ink)'}">\${esc(meta.label)}</span>
      \${e.code ? '<span class="code-wrap"><span class="code">' + highlight(e.code, terms) + '</span><button class="copy-btn" data-copy="' + esc(e.code) + '" title="코드 복사" type="button" aria-label="코드 복사">' + COPY_ICON + '</button>' + (WBS_LEVEL[e.source] ? '<button class="add-btn" data-id="' + esc(e.id) + '" title="' + WBS_LEVEL[e.source] + ' 칸에 담기" type="button" aria-label="조합용으로 담기">' + ADD_ICON + ' 담기</button>' : '') + (['L5', 'L6', 'L7'].includes(WBS_LEVEL[e.source]) ? '<button class="route-btn" data-id="' + esc(e.id) + '" title="이 공종이 적용 가능한 시설 경로 보기" type="button" aria-label="적용 가능 경로 보기">' + ROUTE_ICON + ' 경로보기</button>' : '') + '</span>' : ''}
      <span class="name">\${highlight(e.name, terms)}</span>
    </div>
    \${e.breadcrumb && e.breadcrumb.length ? '<div class="breadcrumb">' + e.breadcrumb.map(esc).join(' &rsaquo; ') + '</div>' : ''}
    \${e.description ? '<div class="desc">' + highlight(e.description, terms) + '</div>' : ''}
    \${extras.length ? '<div class="extra">' + extras.map((x) => '<span class="tag">' + esc(x) + '</span>').join('') + '</div>' : ''}
  \`;
  return div;
}

function copyViaExecCommand(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand copy failed'));
    } catch (err) {
      document.body.removeChild(ta);
      reject(err);
    }
  });
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyViaExecCommand(text));
  }
  return copyViaExecCommand(text);
}

resultsEl.addEventListener('click', (ev) => {
  const copyBtn = ev.target.closest('.copy-btn');
  if (copyBtn) {
    const text = copyBtn.getAttribute('data-copy');
    copyText(text).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = CHECK_ICON;
      setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.innerHTML = COPY_ICON; }, 1200);
    }).catch(() => {
      copyBtn.title = '복사 실패 - 직접 선택해서 복사해주세요';
    });
    return;
  }
  const addBtn = ev.target.closest('.add-btn');
  if (addBtn) {
    const entry = DATA_BY_ID[addBtn.getAttribute('data-id')];
    const level = entry && WBS_LEVEL[entry.source];
    if (entry && level) addToSlot(level, entry);
    addBtn.classList.add('added');
    addBtn.innerHTML = CHECK_ICON + ' 담김';
    setTimeout(() => { addBtn.classList.remove('added'); addBtn.innerHTML = ADD_ICON + ' 담기'; }, 900);
    return;
  }
  const routeBtn = ev.target.closest('.route-btn');
  if (routeBtn) {
    const entry = DATA_BY_ID[routeBtn.getAttribute('data-id')];
    const cardEl = routeBtn.closest('.card');
    if (entry && cardEl) toggleRoutePanel(cardEl, entry);
    return;
  }
  const routeApplyBtn = ev.target.closest('.route-apply');
  if (routeApplyBtn) {
    const entry = DATA_BY_ID[routeApplyBtn.getAttribute('data-id')];
    const route = FACILITY_ROUTES[Number(routeApplyBtn.getAttribute('data-route'))];
    if (entry && route) applyRoute(route, entry);
    routeApplyBtn.textContent = '담김 ✓';
    setTimeout(() => { routeApplyBtn.textContent = '이 경로로 담기'; }, 900);
    return;
  }
});

// --- WBS 코드 조합 트레이 (부속서-2 §3.7: L1-L2-L3-L4-L5-L6-L7을 하이픈으로 연결.
//     L4(시설소분류) 코드의 끝 2자리가 구간번호 슬롯 - 예) E00100 -> E00101(1구간).
//     새 세그먼트를 덧붙이는 게 아니라 L4 코드 자체의 끝자리를 바꿔치기하는 것이 원문 규칙. ---
const SLOTS_KEY = 'kwater-codesearch-slots-v2';
let slots = {};
try { slots = JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}'); } catch (e) { slots = {}; }

const layoutEl = document.getElementById('layout');
const trayEl = document.getElementById('tray');
const traySlotsEl = document.getElementById('traySlots');
const trayPreviewEl = document.getElementById('trayPreview');
const trayCopyBtn = document.getElementById('trayCopy');
const trayClearBtn = document.getElementById('trayClear');

function saveSlots() {
  try { localStorage.setItem(SLOTS_KEY, JSON.stringify(slots)); } catch (e) {}
}
function addToSlot(level, entry) {
  slots[level] = { code: entry.code, name: entry.name, source: entry.source };
  if (level === 'L4') slots[level].section = (entry.code || '').slice(-2);
  if (level === 'L7') slots[level].code = padL7(entry.code);
  saveSlots();
  renderTray();
}
function removeSlot(level) {
  delete slots[level];
  saveSlots();
  renderTray();
}
function routeLevelValues(route, entry) {
  // L4~L7은 이 항목 자신의 레벨만 채운다 - 트레이에 남아있는 다른(무관한) 검색의
  // 슬롯 값을 끌어다 쓰면 마치 이 경로에 속하는 값처럼 보여 오해를 준다 (실사용 버그 신고로 확인).
  const ownLevel = WBS_LEVEL[entry.source];
  const vals = { L1: 'S', L2: route.l2, L3: route.l3, L4: null, L5: null, L6: null, L7: null };
  vals[ownLevel] = ownLevel === 'L7' ? padL7(entry.code) : entry.code;
  return vals;
}
function routeChipHtml(level, code) {
  if (!code) {
    return '<span class="route-chip route-chip--empty"><span class="route-chip-label">' + level + '</span> 직접입력</span>';
  }
  const meta = SOURCE_META[LEVEL_SOURCE[level]] || { color: '#999' };
  return '<span class="route-chip" style="--chip-color:' + meta.color + '">' +
    '<span class="route-chip-label">' + level + '</span><b>' + esc(code) + '</b></span>';
}
function applyRoute(route, entry) {
  addToSlot('L1', { code: 'S', name: '수도분야', source: 'WBS-Lv1' });
  addToSlot('L2', { code: route.l2, name: route.l2Name, source: 'WBS-Lv2' });
  addToSlot('L3', { code: route.l3, name: route.l3Name, source: 'WBS-Lv3' });
  addToSlot(WBS_LEVEL[entry.source], entry);
}
function toggleRoutePanel(cardEl, entry) {
  const existing = cardEl.querySelector('.route-panel');
  if (existing) { existing.remove(); return; }
  const rows = FACILITY_ROUTES.map((route, i) => {
    const vals = routeLevelValues(route, entry);
    const chips = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].map((lv) => routeChipHtml(lv, vals[lv])).join('');
    return '<div class="route-row">' +
      '<span class="route-group">' + esc(route.group) + '</span>' +
      '<div class="route-chips">' + chips + '</div>' +
      '<button class="route-apply" data-id="' + esc(entry.id) + '" data-route="' + i + '" type="button">이 경로로 담기</button>' +
    '</div>';
  }).join('');
  const panel = document.createElement('div');
  panel.className = 'route-panel';
  panel.innerHTML = '<p class="route-hint">L4(시설 소분류)는 시설군 안에 여러 개라 자동으로 못 정해요 - 담은 뒤 트레이에서 직접 검색해서 채워주세요.</p>' + rows;
  cardEl.appendChild(panel);
}
function combinedCode() {
  const parts = [];
  for (const [level] of SLOT_ORDER) {
    const s = slots[level];
    if (!s) continue;
    if (level === 'L4' && s.section) {
      const digits = s.section.replace(/[^0-9]/g, '').padStart(2, '0').slice(-2);
      parts.push(s.code.slice(0, -2) + digits);
    } else {
      parts.push(s.code);
    }
  }
  return parts.join('-');
}
function slotRowHtml(level, label) {
  const s = slots[level];
  let value;
  if (s) {
    const meta = SOURCE_META[s.source] || { color: '#666' };
    const sectionInput = level === 'L4'
      ? '<input class="slot-section" data-slot="L4" value="' + esc(s.section || '') + '" maxlength="2" inputmode="numeric" title="구간번호 (끝 2자리)">'
      : '';
    value = '<span class="slot-dot" style="background:' + meta.color + '"></span>' +
      '<span class="slot-code">' + esc(s.code) + '</span>' +
      sectionInput +
      '<span class="slot-name">' + esc(s.name) + '</span>' +
      '<button class="slot-remove" data-slot="' + level + '" type="button" aria-label="' + esc(label) + ' 제거">' + REMOVE_ICON + '</button>';
  } else {
    value = '<span class="slot-empty-text">비어있음</span>';
  }
  return '<div class="slot-row"><div class="slot-row-label">' + esc(level) + ' ' + esc(label) + '</div><div class="slot-row-value">' + value + '</div></div>';
}
function renderTray() {
  const anyFilled = SLOT_ORDER.some(([level]) => slots[level]);
  layoutEl.classList.toggle('split', anyFilled);
  traySlotsEl.innerHTML = SLOT_GROUPS.map((group) =>
    '<div class="slot-group"><p class="slot-group-title">' + esc(group.title) + '</p>' +
    '<div class="tray-slots">' + group.slots.map(([level, label]) => slotRowHtml(level, label)).join('') + '</div></div>'
  ).join('');
  trayPreviewEl.textContent = combinedCode() || '코드를 담으면 여기 조합됩니다';
}

function updateTrayTop() {
  const header = document.querySelector('header');
  if (!header) return;
  document.documentElement.style.setProperty('--tray-top', (header.offsetHeight + 16) + 'px');
}
updateTrayTop();
window.addEventListener('resize', updateTrayTop);

traySlotsEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.slot-remove');
  if (btn) removeSlot(btn.getAttribute('data-slot'));
});
traySlotsEl.addEventListener('input', (ev) => {
  const inp = ev.target.closest('.slot-section');
  if (!inp || !slots.L4) return;
  slots.L4.section = inp.value.replace(/[^0-9]/g, '').slice(0, 2);
  saveSlots();
  trayPreviewEl.textContent = combinedCode() || '코드를 담으면 여기 조합됩니다';
});
trayClearBtn.addEventListener('click', () => { slots = {}; saveSlots(); renderTray(); });
trayCopyBtn.innerHTML = COPY_ICON + ' 조합 코드 복사';
trayCopyBtn.addEventListener('click', () => {
  copyText(combinedCode()).then(() => {
    trayCopyBtn.classList.add('copied');
    trayCopyBtn.innerHTML = CHECK_ICON + ' 복사됨';
    setTimeout(() => { trayCopyBtn.classList.remove('copied'); trayCopyBtn.innerHTML = COPY_ICON + ' 조합 코드 복사'; }, 1200);
  });
});
renderTray();

const LIMIT = 150;
function render() {
  const raw = qEl.value.trim().toLowerCase();
  const terms = raw.split(/\\s+/).filter(Boolean);
  let pool = selectedSources.size === 0 ? DATA : DATA.filter((e) => selectedSources.has(e.source));
  let list, capped;
  if (terms.length === 0) {
    // browse mode: no query yet, list everything in SOURCES order (Lv1 발주분야 → ... → Pset) unpaginated
    list = pool;
    capped = false;
  } else {
    list = pool.filter((e) => matches(e, terms));
    list.sort((a, b) => score(b, terms) - score(a, terms));
    capped = true;
  }
  resultsEl.innerHTML = '';
  metaEl.textContent = terms.length === 0
    ? \`총 \${list.length.toLocaleString()}개 항목\`
    : \`\${list.length.toLocaleString()}개 결과\${list.length > LIMIT ? ' (상위 ' + LIMIT + '개 표시)' : ''}\`;
  if (list.length === 0) {
    resultsEl.innerHTML = '<div class="empty">결과 없음</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  for (const e of (capped ? list.slice(0, LIMIT) : list)) frag.appendChild(card(e, terms));
  resultsEl.appendChild(frag);
}

qEl.addEventListener('input', render);
document.addEventListener('keydown', (ev) => {
  if (ev.key === '/' && document.activeElement !== qEl) { ev.preventDefault(); qEl.focus(); }
});
render();

// --- 색상기준 탭: K-water BIM 적용지침 표 2.3-2, 정육면체 스와치로 훑어보기 ---
const colorGroupsEl = document.getElementById('colorGroups');
const colorQEl = document.getElementById('colorQ');
const colorFiltersEl = document.getElementById('colorFilters');
const colorMetaEl = document.getElementById('colorMeta');
const COLOR_GROUP_ORDER = [...new Set(COLOR_DATA.map((r) => r.group))];
const selectedColorGroups = new Set();

function shade(rgbStr, amt) {
  const parts = (rgbStr || '').split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return '#999';
  const adjust = (c) => amt >= 0 ? Math.round(c + (255 - c) * amt) : Math.round(c * (1 + amt));
  return 'rgb(' + parts.map(adjust).join(',') + ')';
}
function cubeHtml(rgbStr) {
  const front = shade(rgbStr, -0.06);
  const top = shade(rgbStr, 0.32);
  const side = shade(rgbStr, -0.32);
  return '<div class="cube-scene"><div class="cube">' +
    '<div class="cube-face front" style="background:' + front + '"></div>' +
    '<div class="cube-face top" style="background:' + top + '"></div>' +
    '<div class="cube-face side" style="background:' + side + '"></div>' +
  '</div></div>';
}
function colorTileHtml(row) {
  return '<div class="color-tile">' +
    cubeHtml(row.rgb) +
    '<div class="color-tile-name">' + esc(row.name) + '</div>' +
    '<div class="color-tile-rgb-row"><span class="color-tile-rgb">' + esc(row.rgb) + '</span>' +
    '<button class="copy-btn" data-copy="' + esc(row.rgb) + '" type="button" title="RGB 복사" aria-label="RGB 복사">' + COPY_ICON + '</button></div>' +
  '</div>';
}

function groupRepColor(g) {
  const row = COLOR_DATA.find((r) => r.group === g);
  return row ? shade(row.rgb, 0) : '#999';
}

const colorChipMap = new Map();
const allColorChip = document.createElement('div');
allColorChip.className = 'chip active';
allColorChip.title = '전체 색상 보기';
allColorChip.style.setProperty('--chip-color', 'var(--accent)');
allColorChip.innerHTML = '<span class="dot" style="background:var(--accent)"></span>전체';
allColorChip.onclick = () => {
  selectedColorGroups.clear();
  updateColorChipsUI();
  renderColors();
};
colorFiltersEl.appendChild(allColorChip);

for (const g of COLOR_GROUP_ORDER) {
  const repColor = groupRepColor(g);
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.style.setProperty('--chip-color', repColor);
  chip.innerHTML = '<span class="dot" style="background:' + repColor + '"></span>' + esc(g);
  chip.onclick = () => {
    if (selectedColorGroups.has(g)) { selectedColorGroups.delete(g); }
    else { selectedColorGroups.add(g); }
    updateColorChipsUI();
    renderColors();
  };
  colorFiltersEl.appendChild(chip);
  colorChipMap.set(g, chip);
}

function updateColorChipsUI() {
  const isAll = selectedColorGroups.size === 0;
  allColorChip.classList.toggle('active', isAll);
  for (const [g, chip] of colorChipMap.entries()) {
    chip.classList.toggle('active', selectedColorGroups.has(g));
  }
}

function renderColors() {
  const q = colorQEl.value.trim().toLowerCase();
  const visibleGroups = COLOR_GROUP_ORDER.filter((g) => selectedColorGroups.size === 0 || selectedColorGroups.has(g));
  let matchCount = 0;
  const html = visibleGroups.map((g) => {
    const rows = COLOR_DATA.filter((r) => r.group === g && (!q || r.name.toLowerCase().includes(q) || g.toLowerCase().includes(q)));
    matchCount += rows.length;
    if (!rows.length) return '';
    return '<div class="color-group"><p class="color-group-title">' + esc(g) + '</p>' +
      '<div class="color-tiles">' + rows.map(colorTileHtml).join('') + '</div></div>';
  }).join('');
  colorMetaEl.textContent = (q ? matchCount.toLocaleString() + '개 결과' : '총 ' + matchCount.toLocaleString() + '개 색상 검색 가능');
  colorGroupsEl.innerHTML = html || '<div class="empty">일치하는 시설이 없습니다</div>';
}
colorGroupsEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.copy-btn');
  if (!btn) return;
  const text = btn.getAttribute('data-copy');
  copyText(text).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = CHECK_ICON;
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = COPY_ICON; }, 1200);
  });
});
colorQEl.addEventListener('input', renderColors);
renderColors();

// --- 용어사전 탭: 비전공자를 위한 수도분야 용어 설명 ---
const dictListEl = document.getElementById('dictList');
const dictQEl = document.getElementById('dictQ');
const dictFiltersEl = document.getElementById('dictFilters');
const dictMetaEl = document.getElementById('dictMeta');
const DICT_CATEGORY_ORDER = [...new Set(DICT_DATA.map((r) => r.categoryGroup))]
  .sort((a, b) => (a === '기타') - (b === '기타'));
const selectedDictCategories = new Set();

const dictChipMap = new Map();
const allDictChip = document.createElement('div');
allDictChip.className = 'chip active';
allDictChip.title = '전체 분야 보기';
allDictChip.style.setProperty('--chip-color', 'var(--accent)');
allDictChip.innerHTML = '<span class="dot" style="background:var(--accent)"></span>전체';
allDictChip.onclick = () => {
  selectedDictCategories.clear();
  updateDictChipsUI();
  renderDict();
};
dictFiltersEl.appendChild(allDictChip);

for (const c of DICT_CATEGORY_ORDER) {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.style.setProperty('--chip-color', 'var(--accent)');
  chip.innerHTML = '<span class="dot" style="background:var(--accent)"></span>' + esc(c);
  chip.onclick = () => {
    if (selectedDictCategories.has(c)) { selectedDictCategories.delete(c); }
    else { selectedDictCategories.add(c); }
    updateDictChipsUI();
    renderDict();
  };
  dictFiltersEl.appendChild(chip);
  dictChipMap.set(c, chip);
}

function updateDictChipsUI() {
  const isAll = selectedDictCategories.size === 0;
  allDictChip.classList.toggle('active', isAll);
  for (const [c, chip] of dictChipMap.entries()) {
    chip.classList.toggle('active', selectedDictCategories.has(c));
  }
}

function dictCardHtml(row) {
  return '<div class="card dict-card">' +
    '<div class="dict-card-top">' +
    '<span class="name dict-word">' + esc(row.word) + '</span>' +
    '<span class="tag">' + esc(row.pos) + '</span>' +
    '<span class="tag" title="' + esc(row.category) + '">' + esc(row.categoryGroup) + '</span>' +
    '</div>' +
    '<div class="desc">' + esc(row.definition) + '</div>' +
    (row.explanation ? '<div class="dict-explain"><strong>쉽게 말하면</strong> ' + esc(row.explanation) + '</div>' : '') +
  '</div>';
}

function renderDict() {
  const q = dictQEl.value.trim().toLowerCase();
  const pool = DICT_DATA.filter((r) => selectedDictCategories.size === 0 || selectedDictCategories.has(r.categoryGroup));
  const rows = pool.filter((r) => !q ||
    r.word.toLowerCase().includes(q) ||
    (r.hanja || '').toLowerCase().includes(q) ||
    r.definition.toLowerCase().includes(q) ||
    (r.explanation || '').toLowerCase().includes(q)
  ).sort((a, b) => a.word.localeCompare(b.word, 'ko'));
  dictMetaEl.textContent = (q ? rows.length.toLocaleString() + '개 결과' : '총 ' + rows.length.toLocaleString() + '개 용어 검색 가능');
  dictListEl.innerHTML = rows.length ? rows.map(dictCardHtml).join('') : '<div class="empty">일치하는 용어가 없습니다</div>';
}
dictQEl.addEventListener('input', renderDict);
renderDict();
</script>`;

  return {
    title: 'K-water BIM 코드 검색',
    description: 'K-water BIM 부속서(WBS·속성정보세트)를 즉시 검색합니다.',
    entryCount: entries.length,
    styleCss,
    bodyHtml,
  };
}

module.exports = { buildPage };

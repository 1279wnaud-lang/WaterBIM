// Shared page renderer: produces {title, description, styleCss, bodyHtml}.
// Design language: CAD "drawing layer" metaphor - each data source is a layer with its
// own layer color (like AutoCAD layer colors), codes read like part/drawing numbers on
// a technical data sheet, faint graph-paper grid evokes a drawing canvas. Blueprint teal
// accent instead of a generic SaaS blue, to stay grounded in the BIM/CAD subject matter.
const fs = require('fs');
const path = require('path');

function buildPage() {
  const DATA = path.join(__dirname, '..', 'data');
  const entries = JSON.parse(fs.readFileSync(path.join(DATA, 'search-index.json'), 'utf8'));
  const bimColorsRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'bim-colors-raw.json'), 'utf8'));

  // Layer palette - considered, CAD-layer-inspired hues (not default Tailwind blue/purple/green/amber/red).
  const SOURCE_META = {
    'WBS-Lv1': { group: 'K-water WBS (부속서-2)', label: 'Lv1 발주분야', color: '#3B6EA8' },
    'WBS-Lv2': { group: 'K-water WBS (부속서-2)', label: 'Lv2 시설대분류', color: '#3B6EA8' },
    'WBS-Lv3': { group: 'K-water WBS (부속서-2)', label: 'Lv3 시설중분류', color: '#3B6EA8' },
    'WBS-시설(Lv4)': { group: 'K-water WBS (부속서-2)', label: 'Lv4 시설소분류', color: '#3B6EA8' },
    'WBS-Lv5': { group: 'K-water WBS (부속서-2)', label: 'Lv5 공종대분류', color: '#5B7DA6' },
    'WBS-공종(Lv6)': { group: 'K-water WBS (부속서-2)', label: 'Lv6 공종중분류', color: '#5B7DA6' },
    'WBS-기타(참고, Lv7류)': { group: 'K-water WBS (부속서-2)', label: '참고 (Lv7류)', color: '#8C9A93' },
    'WBS-기타(참고)': { group: 'K-water WBS (부속서-2)', label: '참고', color: '#8C9A93' },
    Pset: { group: 'K-water 속성정보세트 (부속서-7)', label: 'Pset', color: '#4C8C5B' },
  };

  const styleCss = `
  :root {
    --bg: #EEF1EC; --panel: #FFFFFF; --ink: #16231F; --muted: #5B6B63;
    --border: #D6DED4; --accent: #0E7C86; --accent-ink: #ffffff;
    --code-bg: #E4EAE2; --grid-line: rgba(14,124,134,.07); --mark-bg: #F4CE68; --mark-ink: #2A2205;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0E1512; --panel: #16211D; --ink: #E7EFE9; --muted: #8CA396;
      --border: #26352E; --accent: #37C6D0; --accent-ink: #06231F;
      --code-bg: #1D2A24; --grid-line: rgba(55,198,208,.08); --mark-bg: #4A3B0E; --mark-ink: #F6E4A8; }
  }
  :root[data-theme="dark"] { --bg: #0E1512; --panel: #16211D; --ink: #E7EFE9; --muted: #8CA396;
    --border: #26352E; --accent: #37C6D0; --accent-ink: #06231F;
    --code-bg: #1D2A24; --grid-line: rgba(55,198,208,.08); --mark-bg: #4A3B0E; --mark-ink: #F6E4A8; }
  :root[data-theme="light"] { --bg: #EEF1EC; --panel: #FFFFFF; --ink: #16231F; --muted: #5B6B63;
    --border: #D6DED4; --accent: #0E7C86; --accent-ink: #ffffff;
    --code-bg: #E4EAE2; --grid-line: rgba(14,124,134,.07); --mark-bg: #F4CE68; --mark-ink: #2A2205; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
    background:
      linear-gradient(var(--grid-line) 1px, transparent 1px) 0 0 / 28px 28px,
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px) 0 0 / 28px 28px,
      var(--bg);
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
  .nav-list { padding: 10px 0; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 18px; cursor: pointer;
    font-size: 13px; font-weight: 600; color: var(--muted); border-left: 3px solid transparent;
  }
  .nav-item svg { width: 15px; height: 15px; flex: none; }
  .nav-item:hover { color: var(--ink); background: var(--code-bg); }
  .nav-item.active {
    color: var(--ink); border-left-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--panel));
  }

  .main-area { flex: 1; min-width: 0; }
  .header-top { display: flex; align-items: flex-start; gap: 12px; }
  .header-main { flex: 1; min-width: 0; }
  .sidebar-toggle {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border);
    background: var(--panel); color: var(--muted); cursor: pointer; margin-top: 1px;
  }
  .sidebar-toggle:hover { background: var(--code-bg); color: var(--ink); }
  .sidebar-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .sidebar-toggle svg { width: 16px; height: 16px; }

  header {
    position: sticky; top: 0; z-index: 10;
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--border);
    padding: 18px 22px 14px;
  }
  .eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 4px;
  }
  h1 { font-size: 18px; margin: 0 0 12px; font-weight: 700; letter-spacing: -.01em; text-wrap: balance; }

  .search-row { position: relative; }
  .search-row input {
    width: 100%; font-size: 15.5px; padding: 12px 14px 12px 38px; border-radius: 8px;
    border: 1.5px solid var(--border); background: var(--panel); color: var(--ink); outline: none;
    font-family: inherit;
  }
  .search-row input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  .search-row svg.search-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    width: 16px; height: 16px; color: var(--muted); pointer-events: none;
  }

  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; padding: 5px 10px 5px 8px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--panel); color: var(--muted); cursor: pointer; user-select: none;
    transition: opacity .12s;
  }
  .chip .dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
  .chip.active { color: var(--ink); border-color: color-mix(in srgb, var(--chip-color, var(--accent)) 55%, var(--border)); background: color-mix(in srgb, var(--chip-color, var(--accent)) 10%, var(--panel)); }
  .chip:not(.active) { opacity: .55; }
  .chip:not(.active) .dot { opacity: .5; }

  #meta, #colorMeta, #wbsTreeMeta { font-size: 12px; color: var(--muted); margin-top: 10px; font-variant-numeric: tabular-nums; }

  .layout {
    display: grid; grid-template-columns: 1fr; gap: 22px; align-items: start;
    max-width: 1320px; margin: 0 auto; padding: 16px 22px 60px;
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
    background: var(--panel); border: 1px solid var(--border); border-left: 3px solid var(--card-color, var(--border));
    border-radius: 8px; padding: 13px 15px; margin: 0 0 10px;
  }
  .card-top { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
  .badge {
    font-size: 10.5px; font-weight: 700; letter-spacing: .03em; padding: 2.5px 7px; border-radius: 4px;
    color: white; white-space: nowrap;
  }
  .code-wrap { display: inline-flex; align-items: center; gap: 3px; }
  .code {
    font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
    font-weight: 600; font-size: 13.5px; letter-spacing: .01em;
    background: var(--code-bg); padding: 1.5px 6px; border-radius: 4px;
  }
  .copy-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0; border-radius: 5px; border: 1px solid transparent;
    background: transparent; color: var(--muted); cursor: pointer;
  }
  .copy-btn:hover { background: var(--code-bg); color: var(--ink); border-color: var(--border); }
  .copy-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .copy-btn.copied { color: #4C8C5B; }
  .copy-btn svg { width: 13px; height: 13px; pointer-events: none; }
  .name { font-size: 14.5px; font-weight: 600; }
  .breadcrumb { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
  .desc { font-size: 13px; margin-top: 7px; white-space: pre-wrap; line-height: 1.55; }
  .extra { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
  .tag {
    font-size: 11px; background: var(--code-bg); color: var(--muted);
    padding: 3px 8px; border-radius: 5px; font-variant-numeric: tabular-nums;
  }
  .empty { color: var(--muted); text-align: center; padding: 50px 0; font-size: 13.5px; }
  mark { background: var(--mark-bg); color: var(--mark-ink); border-radius: 3px; padding: 0 1px; }

  kbd {
    font-family: ui-monospace, Consolas, monospace; font-size: 11px; background: var(--code-bg);
    border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px; padding: 1px 5px; color: var(--muted);
  }

  .add-btn {
    display: inline-flex; align-items: center; gap: 4px;
    height: 24px; padding: 0 9px; border-radius: 6px; border: 1px solid transparent;
    background: var(--accent); color: var(--accent-ink); cursor: pointer; font-size: 11.5px; font-weight: 700;
  }
  .add-btn:hover { filter: brightness(1.08); }
  .add-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .add-btn.added { background: #4C8C5B; }
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
    margin-top: 10px; padding: 10px 12px; border-radius: 8px;
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
    font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
    font-weight: 700; color: var(--ink); font-size: 12px;
  }
  .route-chip-label { font-size: 9.5px; font-weight: 700; letter-spacing: .03em; color: var(--muted); }
  .route-chip--empty {
    background: transparent; border: 1px dashed var(--border); color: var(--muted); font-style: italic;
  }
  .route-apply {
    flex: none; font-size: 11.5px; padding: 5px 10px; border-radius: 5px; border: 1px solid var(--border);
    background: var(--panel); color: var(--ink); cursor: pointer; margin-left: auto;
  }
  .route-apply:hover { border-color: var(--accent); color: var(--accent); }

  .tray {
    position: sticky; top: var(--tray-top, 90px);
    background: var(--panel); border: 1px solid var(--border); border-radius: 12px;
    padding: 20px 24px 24px; max-height: calc(100vh - var(--tray-top, 90px) - 20px); overflow-y: auto;
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
    font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
    font-size: 13.5px; font-weight: 700; letter-spacing: .01em; flex: none;
    background: var(--code-bg); padding: 2px 7px; border-radius: 4px;
  }
  .slot-name {
    font-size: 12.5px; color: var(--muted); min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .slot-section {
    width: 34px; text-align: center; font-family: ui-monospace, Consolas, monospace; font-size: 12px;
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
    font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace; font-size: 15px; font-weight: 700;
    background: var(--code-bg); border-radius: 7px; padding: 10px 14px; flex: 1; min-width: 0;
    overflow-x: auto; white-space: nowrap;
  }
  .tray-copy {
    display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
    background: var(--accent); color: var(--accent-ink); border: none; border-radius: 7px; padding: 10px 16px; cursor: pointer; flex: none;
  }
  .tray-copy svg { width: 14px; height: 14px; }
  .tray-copy.copied { background: #4C8C5B; }
  .tray-hint { font-size: 11.5px; color: var(--muted); margin-top: 12px; line-height: 1.55; }

  /* --- 색상기준 탭: 정육면체(true 3D cube) 스와치 그리드 --- */
  .color-groups { max-width: 1200px; margin: 0 auto; padding: 18px 22px 60px; }
  .color-group { margin-bottom: 30px; }
  .color-group-title {
    font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    color: var(--accent); margin: 0 0 14px; padding-bottom: 7px; border-bottom: 1.5px solid var(--border);
  }
  .color-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 14px; }
  .color-tile {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px 8px 12px;
  }
  .color-tile-name { font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.3; }
  .color-tile-rgb-row { display: flex; align-items: center; gap: 3px; }
  .color-tile-rgb { font-family: ui-monospace, Consolas, monospace; font-size: 11px; color: var(--muted); }

  .cube-scene { width: 58px; height: 58px; margin: 6px auto 14px; perspective: 320px; }
  .cube {
    position: relative; width: 100%; height: 100%; transform-style: preserve-3d;
    transform: rotateX(-28deg) rotateY(-38deg);
  }
  .cube-face { position: absolute; width: 58px; height: 58px; border: 1px solid rgba(0,0,0,.14); }
  .cube-face.front { transform: translateZ(29px); }
  .cube-face.top { transform: rotateX(90deg) translateZ(29px); }
  .cube-face.side { transform: rotateY(90deg) translateZ(29px); }

  /* --- WBS 트리 탭: 공종(Lv5→Lv6) · 시설(Lv1→Lv3) 계층 트리 --- */
  .subhead { font-size: 12.5px; color: var(--muted); max-width: 760px; line-height: 1.6; margin: 0 0 4px; }
  .wbstree-layout { max-width: 1200px; margin: 0 auto; padding: 18px 22px 60px; display: flex; flex-direction: column; gap: 26px; }
  .section-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px 22px; }
  .section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    margin: 0 0 4px; padding-bottom: 12px; border-bottom: 1.5px solid var(--border); }
  .section-title { font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--accent); }
  .section-sub { font-size: 11.5px; color: var(--muted); margin-top: 3px; }
  .section-actions { display: flex; align-items: center; gap: 8px; }
  .tree-toggle-btn {
    font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--panel); color: var(--muted); cursor: pointer;
  }
  .tree-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
  .tree-toggle-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .node {
    display: inline-flex; align-items: baseline; gap: 8px;
    background: var(--code-bg); border-left: 3px solid var(--accent);
    border-radius: 0 5px 5px 0; padding: 5px 9px;
  }
  .node .code { font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace; font-weight: 700; font-size: 12.5px; color: var(--ink); }
  .node .name { font-size: 12px; color: var(--muted); }
  .node.parent { background: color-mix(in srgb, var(--accent) 9%, var(--panel)); border-left-color: var(--accent); }
  .node.parent .code { font-size: 13px; }
  .node.parent .name { color: var(--ink); font-weight: 600; }
  .node.child { background: var(--code-bg); border-left: 3px solid color-mix(in srgb, var(--accent) 45%, var(--border)); }

  .tree-group { margin: 0 0 4px; }
  .tree-group summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .tree-group summary::-webkit-details-marker { display: none; }
  .tree-group summary::before {
    content: ''; width: 0; height: 0; flex: none;
    border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 5px solid var(--muted);
    transition: transform .1s ease; margin-right: 1px;
  }
  .tree-group[open] > summary::before { transform: rotate(90deg); }
  .tree-group summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  .tree-group-count { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .tree-group-empty { display: flex; align-items: center; gap: 8px; padding: 3px 0 3px 13px; }

  ul.tree-children { list-style: none; margin: 4px 0 2px 9px; padding: 0; }
  ul.tree-children > li { position: relative; padding: 4px 0 4px 24px; }
  ul.tree-children > li::before {
    content: ''; position: absolute; top: 50%; left: 0; width: 18px; height: 2px;
    background: color-mix(in srgb, var(--accent) 30%, var(--border));
  }
  ul.tree-children > li::after {
    content: ''; position: absolute; top: 0; left: 0; width: 2px; height: 50%;
    background: color-mix(in srgb, var(--accent) 30%, var(--border));
  }
  ul.tree-children > li:not(:last-child)::after { height: 100%; }
  ul.tree-children ul.tree-children { margin-left: 4px; }

  .discipline-groups { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }

  .unclassified {
    margin-top: 16px; border: 1.5px dashed var(--border); border-radius: 8px;
    padding: 12px 14px; background: var(--bg);
  }
  .unclassified-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .unclassified-tag {
    font-size: 10.5px; font-weight: 700; letter-spacing: .03em; padding: 2.5px 8px; border-radius: 4px;
    background: var(--mark-bg); color: var(--mark-ink);
  }
  .unclassified-count { font-size: 11.5px; color: var(--muted); }
  .unclassified-nodes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  .unclassified-nodes .node { border-left-color: color-mix(in srgb, var(--mark-bg) 70%, var(--border)); background: var(--code-bg); }
  .unclassified-note { font-size: 11.5px; color: var(--muted); line-height: 1.6; margin: 0; }

  .facility-wrap { max-width: 620px; margin-top: 4px; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  `;

  const SEARCH_ICON = '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>';
  const TOGGLE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
  const NAV_SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
  const NAV_PALETTE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c1.7 0 3.1-1.4 3.1-3.1C20.5 6.6 16.7 2 12 2Z"></path><circle cx="7" cy="10" r="1.2"></circle><circle cx="12" cy="7" r="1.2"></circle><circle cx="16.5" cy="10" r="1.2"></circle></svg>';
  const NAV_TREE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.3"></circle><circle cx="6" cy="18" r="2.3"></circle><circle cx="18" cy="12" r="2.3"></circle><path d="M8.1 6.9 15.9 11.1M8.1 17.1 15.9 12.9"></path></svg>';

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
            <p class="eyebrow">K-water</p>
            <h1>BIM 코드&middot;기준 검색</h1>
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
            <p class="eyebrow">K-water BIM 적용지침 표 2.3-2</p>
            <h1>BIM 모델 색상&middot;재질 기준</h1>
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
    <section class="tab-panel" data-tab="wbstree" style="display:none">
      <header>
        <div class="header-top">
          <button class="sidebar-toggle" type="button" aria-label="사이드바 토글">${TOGGLE_ICON}</button>
          <div class="header-main">
            <p class="eyebrow">K-water WBS (부속서-2 §3.8)</p>
            <h1>WBS 계층 트리</h1>
            <p class="subhead">공종(工種)과 시설(施設)은 WBS 상 서로 독립된 두 개의 분류축이라 각각 별도 트리로 표시합니다 · 신뢰 가능한 부모 링크가 없는 Lv4·Lv7은 트리에서 제외됩니다.</p>
            <div id="wbsTreeMeta"></div>
          </div>
        </div>
      </header>
      <div class="wbstree-layout" id="wbsTreeLayout">
        <section class="section-panel">
          <div class="section-head">
            <div>
              <div class="section-title">공종 분류 (Lv5 → Lv6)</div>
              <div class="section-sub">공종대분류 → 공종중분류 · prefix-match(부속서-2 §3.8)로 검증된 관계만 표시</div>
            </div>
            <div class="section-actions">
              <button class="tree-toggle-btn" id="treeToggleBtn" type="button">모두 펼치기</button>
            </div>
          </div>
          <div id="disciplineTreeBody">
            <div class="discipline-groups" id="disciplineGroups"></div>
            <div id="disciplineUnclassified"></div>
          </div>
        </section>
        <section class="section-panel">
          <div class="section-head">
            <div>
              <div class="section-title">시설 분류 (Lv1 → Lv2 → Lv3)</div>
              <div class="section-sub">발주분야 → 시설대분류 → 시설중분류</div>
            </div>
          </div>
          <div id="facilityTreeBody"></div>
        </section>
      </div>
    </section>
  </div>
</div>
<script>
const SOURCE_META = ${JSON.stringify(SOURCE_META)};
const SOURCES = Object.keys(SOURCE_META);
const DATA = ${JSON.stringify(entries)};
const COLOR_DATA = ${JSON.stringify(bimColorsRaw)};
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
  { id: 'codesearch', label: '코드서치', icon: '${NAV_SEARCH_ICON}' },
  { id: 'colors', label: '색상기준', icon: '${NAV_PALETTE_ICON}' },
  { id: 'wbstree', label: 'WBS 트리', icon: '${NAV_TREE_ICON}' },
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
      <span class="badge" style="background:\${meta.color}">\${esc(meta.label)}</span>
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
  const ownLevel = WBS_LEVEL[entry.source];
  const vals = { L1: 'S', L2: route.l2, L3: route.l3 };
  ['L4', 'L5', 'L6', 'L7'].forEach((lv) => {
    let code = lv === ownLevel ? entry.code : (slots[lv] && slots[lv].code);
    vals[lv] = code ? (lv === 'L7' ? padL7(code) : code) : null;
  });
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

// --- WBS 트리 탭: 공종(Lv5→Lv6) · 시설(Lv1→Lv3) 계층 트리 ---
// 두 트리 모두 하드코딩된 샘플이 아니라 매 로드 시 DATA(search-index.json)에서 다시 계산한다 -
// 소스 데이터가 재빌드돼도 트리가 자동으로 최신 상태를 반영하고, 검증되지 않은 관계는 그리지 않는다.
function nodeHtml(code, name, cls) {
  return '<div class="node' + (cls ? ' ' + cls : '') + '"><span class="code">' + esc(code) + '</span><span class="name">' + esc(name) + '</span></div>';
}

// 공종 Lv5→Lv6: 부속서-2 §3.8 - Lv6(3자리) 앞 2자리가 그대로 Lv5(2자리) 코드로 확장되는 공식 규칙.
// 이 prefix가 실제 Lv5 코드 집합에 없는 Lv6는 "미분류"로 별도 표시하고 조용히 누락하지 않는다.
function buildDisciplineTree() {
  const lv5 = DATA.filter((e) => e.source === 'WBS-Lv5').slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const lv6 = DATA.filter((e) => e.source === 'WBS-공종(Lv6)').slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const bodyEl = document.getElementById('disciplineTreeBody');
  const toggleBtn = document.getElementById('treeToggleBtn');
  if (lv5.length === 0 || lv6.length === 0) {
    bodyEl.innerHTML = '<div class="empty">공종 계층 데이터를 불러오지 못했습니다 (Lv5 또는 Lv6 원본이 비어 있습니다). 소스 데이터(search-index.json)를 다시 빌드하거나 페이지를 새로고침해 주세요.</div>';
    if (toggleBtn) toggleBtn.style.display = 'none';
    return { groups: 0, children: 0, unclassified: 0 };
  }
  const lv5Codes = new Set(lv5.map((e) => e.code));
  const childrenByParent = new Map(lv5.map((p) => [p.code, []]));
  const unclassified = [];
  for (const c of lv6) {
    const prefix = (c.code || '').slice(0, 2);
    if (childrenByParent.has(prefix)) childrenByParent.get(prefix).push(c);
    else unclassified.push(c);
  }
  const groupsHtml = lv5.map((p) => {
    const kids = childrenByParent.get(p.code) || [];
    const parentNode = nodeHtml(p.code, p.name, 'parent');
    if (kids.length === 0) {
      return '<div class="tree-group-empty">' + parentNode + '<span class="tree-group-count">0개</span></div>';
    }
    const kidsHtml = kids.map((c) => '<li>' + nodeHtml(c.code, c.name, 'child') + '</li>').join('');
    return '<details class="tree-group"><summary>' + parentNode +
      '<span class="tree-group-count">' + kids.length + '개</span></summary>' +
      '<ul class="tree-children">' + kidsHtml + '</ul></details>';
  }).join('');
  document.getElementById('disciplineGroups').innerHTML = groupsHtml;

  const unclassifiedEl = document.getElementById('disciplineUnclassified');
  if (unclassified.length === 0) {
    unclassifiedEl.innerHTML = '';
  } else {
    const missingPrefixes = [...new Set(unclassified.map((c) => (c.code || '').slice(0, 2)))];
    const nodesHtml = unclassified.map((c) => nodeHtml(c.code, c.name, '')).join('');
    unclassifiedEl.innerHTML = '<div class="unclassified">' +
      '<div class="unclassified-head"><span class="unclassified-tag">미분류</span>' +
      '<span class="unclassified-count">Lv6 ' + unclassified.length + '개 · Lv5 부모 코드 "' + missingPrefixes.map(esc).join('", "') + '"가 소스 데이터에 없음</span></div>' +
      '<div class="unclassified-nodes">' + nodesHtml + '</div>' +
      '<p class="unclassified-note">원본 데이터에 해당 Lv5 마스터 행 자체가 누락된 것으로 추정됩니다 - 조용히 빠뜨리지 않고 별도 그룹으로 표시합니다 (부속서-2 §3.8 prefix 규칙 기준 미매칭 항목).</p></div>';
  }
  if (toggleBtn) {
    toggleBtn.style.display = '';
    toggleBtn.addEventListener('click', () => {
      const details = document.querySelectorAll('#disciplineGroups .tree-group');
      const anyClosed = [...details].some((d) => !d.open);
      details.forEach((d) => { d.open = anyClosed; });
      toggleBtn.textContent = anyClosed ? '모두 접기' : '모두 펼치기';
    });
  }
  return { groups: lv5.length, children: lv6.length, unclassified: unclassified.length };
}

// 시설 Lv1→Lv2→Lv3: Lv1→Lv2는 소스에 연결 필드가 없어, 현재처럼 Lv1이 정확히 1개일 때만
// "모든 Lv2가 그 Lv1의 자식"이라는 관계를 안전하게 추론할 수 있다 (그 외엔 표시하지 않음 - 추측 금지).
// Lv2→Lv3는 코드 prefix로 일반화되지 않으므로(F00→'1'이 규칙을 깨뜨림), 코드서치 탭의
// "경로보기" 기능에서 이미 교차 검증된 FACILITY_ROUTES를 재사용하되, 실제 lv2/lv3 레코드
// 존재 여부를 다시 확인해 검증 안 된 관계는 그리지 않는다.
function buildFacilityTree() {
  const lv1 = DATA.filter((e) => e.source === 'WBS-Lv1');
  const lv2 = DATA.filter((e) => e.source === 'WBS-Lv2');
  const lv3 = DATA.filter((e) => e.source === 'WBS-Lv3');
  const bodyEl = document.getElementById('facilityTreeBody');
  if (lv1.length === 0 || lv2.length === 0 || lv3.length === 0) {
    bodyEl.innerHTML = '<div class="empty">시설 계층 데이터를 불러오지 못했습니다 (Lv1, Lv2 또는 Lv3 원본이 비어 있습니다). 소스 데이터(search-index.json)를 다시 빌드하거나 페이지를 새로고침해 주세요.</div>';
    return { nodes: 0, edges: 0 };
  }
  if (lv1.length !== 1) {
    bodyEl.innerHTML = '<div class="empty">Lv1이 ' + lv1.length + '개로 늘어나 Lv1→Lv2 관계를 소스 데이터만으로 안전하게 판별할 수 없어 트리 표시를 건너뜁니다.</div>';
    return { nodes: 0, edges: 0 };
  }
  const root = lv1[0];
  const lv3ByCode = new Map(lv3.map((e) => [e.code, e]));
  const l2Children = new Map(lv2.map((e) => [e.code, []]));
  let edgeCount = lv2.length; // L1 -> 각 L2
  for (const route of FACILITY_ROUTES) {
    if (!l2Children.has(route.l2)) continue;
    const l3Entry = lv3ByCode.get(route.l3);
    if (!l3Entry) continue;
    l2Children.get(route.l2).push(l3Entry);
    edgeCount++;
  }
  const l2Html = lv2.map((l2) => {
    const kids = l2Children.get(l2.code) || [];
    const kidsHtml = kids.map((l3) => '<li>' + nodeHtml(l3.code, l3.name, '') + '</li>').join('');
    return '<li>' + nodeHtml(l2.code, l2.name, 'child') +
      (kidsHtml ? '<ul class="tree-children">' + kidsHtml + '</ul>' : '') + '</li>';
  }).join('');
  bodyEl.innerHTML = '<div class="facility-wrap"><div class="tree-root">' +
    nodeHtml(root.code, root.name, 'parent') +
    '<ul class="tree-children">' + l2Html + '</ul></div></div>';
  let leafCount = 0;
  for (const kids of l2Children.values()) leafCount += kids.length;
  return { nodes: 1 + lv2.length + leafCount, edges: edgeCount };
}

(function renderWbsTree() {
  const discResult = buildDisciplineTree();
  const facResult = buildFacilityTree();
  const metaEl = document.getElementById('wbsTreeMeta');
  if (metaEl) {
    const parts = [];
    if (discResult.groups) {
      parts.push('공종 Lv5 ' + discResult.groups + '개 · Lv6 ' + discResult.children + '개' +
        (discResult.unclassified ? ' (미분류 ' + discResult.unclassified + '개 포함)' : ''));
    }
    if (facResult.nodes) parts.push('시설 ' + facResult.nodes + '개 노드 / ' + facResult.edges + '개 엣지');
    metaEl.textContent = parts.join(' · ');
  }
})();
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

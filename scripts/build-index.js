// Build the unified search-index.json from the raw sheet-JSON dumps.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const wbsData = JSON.parse(fs.readFileSync(path.join(DATA, 'wbs.json'), 'utf8'));
const psetData = JSON.parse(fs.readFileSync(path.join(DATA, 'pset.json'), 'utf8'));
const bimColorsRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'bim-colors-raw.json'), 'utf8'));
// Note: library.json / pps-codes-raw.json / pps-parts-raw.json are still extracted on disk
// (data/) but no longer fed into the index - 라이브러리/PPS 공사코드/PPS 부위분류 dropped per request.

function clean(v) {
  return (v || '').replace(/\r\n/g, '\n').trim();
}

// Forward-fill each column independently (matches genuine Excel merged-cell export semantics).
function forwardFill(rows, cols) {
  const last = {};
  return rows.map((row) => {
    const out = row.values.slice();
    for (const c of cols) {
      if (clean(out[c])) last[c] = out[c];
      else out[c] = last[c] || '';
    }
    return { row: row.row, values: out };
  });
}

let entries = [];
let idCounter = 0;
function nextId(prefix) {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

// ---------- 1. WBS dictionary (부속서-2) ----------
{
  const sheet = wbsData['1.BIM WBS 목록서(사전Dictionary형태)'];
  const dataRows = sheet.rows.filter((r) => r.row >= 4);

  function collectFlatList(codeCol, nameCol, source, levelLabel, skipCodes = []) {
    const seen = new Set();
    for (const row of dataRows) {
      const code = clean(row.values[codeCol]);
      const name = clean(row.values[nameCol]);
      if (!code || !name || skipCodes.includes(code) || seen.has(code)) continue;
      seen.add(code);
      entries.push({
        id: nextId('wbs'),
        source,
        code,
        name,
        breadcrumb: [levelLabel],
        description: levelLabel,
      });
    }
  }

  collectFlatList(0, 1, 'WBS-Lv1', 'Lv1 발주분야');
  collectFlatList(2, 3, 'WBS-Lv2', 'Lv2 시설 대분류');
  collectFlatList(4, 5, 'WBS-Lv3', 'Lv3 시설 중분류');
  collectFlatList(6, 7, 'WBS-시설(Lv4)', 'Lv4 시설 소분류', ['코드예시']);
  collectFlatList(8, 9, 'WBS-Lv5', 'Lv5 공종 대분류');
  collectFlatList(10, 11, 'WBS-공종(Lv6)', 'Lv6 공종 중분류');
  collectFlatList(12, 13, 'WBS-기타(참고, Lv7류)', 'Lv7 관련 예시 - 상위 분류 불확실, 참고용');
  collectFlatList(14, 15, 'WBS-기타(참고)', '용도 불명 코드 목록 - 참고용');
}

// ---------- 2. Pset sheets (부속서-7) ----------
{
  const psetCols = [0, 1, 2, 3, 4, 5, 6];
  for (const [sheetName, sheet] of Object.entries(psetData)) {
    if (sheetName.includes('간지')) continue;
    const headerRow = sheet.rows.find((r) => r.row === 3);
    if (!headerRow || clean(headerRow.values[0]) !== '대분류') continue;

    const dataRows = sheet.rows.filter((r) => r.row >= 4);
    const filled = forwardFill(dataRows, psetCols);
    for (const row of filled) {
      const v = row.values.map(clean);
      const [maj, majN, mid, midN, min, minN, code, attrName, format, unit, example, designer, contractor, om, desc] = v;
      if (!code || !attrName) continue;
      entries.push({
        id: nextId('pset'),
        source: 'Pset',
        code,
        name: attrName,
        breadcrumb: [`${maj} ${majN}`, mid ? `${mid} ${midN}` : null, min ? `${min} ${minN}` : null].filter(Boolean),
        description: desc || '',
        format,
        unit,
        example,
        inputBy: [designer && '설계자', contractor && '시공자', om && '유지관리자'].filter(Boolean).join('/'),
        scope: sheetName === '속성정보세트(전체)' ? '공통' : sheetName.replace(/ WBS L[47]\s?입력/, ''),
      });
    }
  }
}

// ---------- 3. BIM 모델 색상 매핑 ----------
{
  const colorByName = new Map(bimColorsRaw.map((r) => [r.name, r.rgb]));
  for (const e of entries) {
    if (e.source === 'WBS-시설(Lv4)' && colorByName.has(e.name)) {
      e.rgb = colorByName.get(e.name);
    }
  }
}

const outPath = path.join(DATA, 'search-index.json');
fs.writeFileSync(outPath, JSON.stringify(entries));
console.log(`Wrote ${outPath}: ${entries.length} entries`);
const bySource = {};
for (const e of entries) bySource[e.source] = (bySource[e.source] || 0) + 1;
console.log(bySource);

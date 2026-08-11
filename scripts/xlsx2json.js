// Dump every sheet of an unzipped .xlsx into one JSON file.
// Usage: node xlsx2json.js <unzippedDir> <outFile.json>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const outFile = process.argv[3];

function decodeXmlEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10))).replace(/&amp;/g, '&');
}

const sharedStringsPath = path.join(dir, 'xl', 'sharedStrings.xml');
let sharedStrings = [];
if (fs.existsSync(sharedStringsPath)) {
  const xml = fs.readFileSync(sharedStringsPath, 'utf8');
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRegex.exec(xml)) !== null) {
    const inner = m[1];
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let text = '';
    let tm;
    while ((tm = tRegex.exec(inner)) !== null) text += decodeXmlEntities(tm[1]);
    sharedStrings.push(text);
  }
}

function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
  return n;
}

function parseSheet(sheetPath) {
  const xml = fs.readFileSync(sheetPath, 'utf8');
  const rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let rowMatch;
  const rows = [];
  let maxCol = 0;

  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[2];
    const rowCells = {};
    let cellMatch;
    cellRegex.lastIndex = 0;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2] || '';
      const refMatch = attrs.match(/r="([A-Z]+)(\d+)"/);
      if (!refMatch) continue;
      const col = colToNum(refMatch[1]);
      maxCol = Math.max(maxCol, col);
      const typeMatch = attrs.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : null;

      let value = '';
      if (type === 'inlineStr') {
        const tMatch = cellBody.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tMatch ? decodeXmlEntities(tMatch[1]) : '';
      } else {
        const vMatch = cellBody.match(/<v>([\s\S]*?)<\/v>/);
        const raw = vMatch ? vMatch[1] : '';
        if (type === 's') {
          const idx = parseInt(raw, 10);
          value = sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
        } else if (type === 'str' || type === 'e') {
          value = decodeXmlEntities(raw);
        } else {
          value = raw;
        }
      }
      rowCells[col] = value;
    }
    rows.push({ r: parseInt(rowMatch[1], 10), cells: rowCells });
  }

  const grid = rows.map((row) => {
    const line = [];
    for (let c = 1; c <= maxCol; c++) line.push(row.cells[c] || '');
    return { row: row.r, values: line };
  });
  return { maxCol, grid };
}

// workbook.xml -> ordered sheet list (name -> rId)
const workbookXml = fs.readFileSync(path.join(dir, 'xl', 'workbook.xml'), 'utf8');
const sheetTagRegex = /<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"[^>]*\/>/g;
const sheets = [];
let sm;
while ((sm = sheetTagRegex.exec(workbookXml)) !== null) {
  sheets.push({ name: sm[1], rId: sm[2] });
}

const relsXml = fs.readFileSync(path.join(dir, 'xl', '_rels', 'workbook.xml.rels'), 'utf8');
const relRegex = /<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"[^>]*\/>/g;
const relMap = {};
let rm;
while ((rm = relRegex.exec(relsXml)) !== null) relMap[rm[1]] = rm[2];

const result = {};
for (const s of sheets) {
  const target = relMap[s.rId];
  if (!target || !target.startsWith('worksheets/')) continue;
  const sheetPath = path.join(dir, 'xl', target);
  if (!fs.existsSync(sheetPath)) continue;
  const { maxCol, grid } = parseSheet(sheetPath);
  result[s.name] = { maxCol, rows: grid };
}

fs.writeFileSync(outFile, JSON.stringify(result));
console.log(`Wrote ${outFile}: ${Object.keys(result).length} sheets`);
for (const [name, data] of Object.entries(result)) {
  console.log(`  - ${name}: ${data.rows.length} rows x ${data.maxCol} cols`);
}

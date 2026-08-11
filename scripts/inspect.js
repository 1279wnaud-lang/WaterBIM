// Print header row + first N sample rows for a given sheet.
// Usage: node inspect.js <file.json> "<sheetName>" [numSamples]
const fs = require('fs');
const file = process.argv[2];
const sheetName = process.argv[3];
const n = parseInt(process.argv[4] || '5', 10);

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (sheetName === '__list__') {
  for (const name of Object.keys(data)) console.log(name);
  process.exit(0);
}
const sheet = data[sheetName];
if (!sheet) {
  console.error('Sheet not found:', sheetName);
  console.error('Available:', Object.keys(data).join(', '));
  process.exit(1);
}
console.log(`maxCol=${sheet.maxCol}, rows=${sheet.rows.length}`);
for (const row of sheet.rows.slice(0, n)) {
  console.log(row.row + ': ' + JSON.stringify(row.values));
}

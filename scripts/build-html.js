// Local, double-click-to-open version: full HTML document.
const fs = require('fs');
const path = require('path');
const { buildPage } = require('./render');

const { title, styleCss, bodyHtml, entryCount } = buildPage();

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${styleCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html, 'utf8');
console.log('Wrote index.html, entries:', entryCount);

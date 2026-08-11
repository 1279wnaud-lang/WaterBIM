// Artifact-ready version: no <!doctype>/<html>/<head>/<body> wrapper tags
// (the Artifact publisher supplies those itself) - just <title> + <style> + body content.
const fs = require('fs');
const path = require('path');
const { buildPage } = require('./render');

const { title, styleCss, bodyHtml, entryCount } = buildPage();

const html = `<title>${title}</title>
<style>${styleCss}</style>
${bodyHtml}
`;

fs.writeFileSync(path.join(__dirname, '..', 'artifact.html'), html, 'utf8');
console.log('Wrote artifact.html, entries:', entryCount);

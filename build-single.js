// Build single-file worker for Cloudflare dashboard Quick Edit.
// Avoids String.replace $ -pattern pitfalls by using split/join + concatenation.
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const html = fs.readFileSync(path.join(dir, 'public', 'index.html'), 'utf8');
let src = fs.readFileSync(path.join(dir, 'worker.js'), 'utf8');
const needle = 'return env.ASSETS.fetch(request);';
if (!src.includes(needle)) { console.error('needle not found'); process.exit(1); }
src = src.split(needle).join("return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });");
const out = 'const PAGE = ' + JSON.stringify(html) + ';\n' + src;
fs.writeFileSync(path.join(dir, 'worker-single.js'), out);
console.log('built worker-single.js (' + out.length + ' bytes)');

// Renders each demo screen in index.html and writes WebP files to public/assets/img/app/.
// Usage (from this folder): node shoot.js   — needs Playwright + Python 3 with Pillow.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const OUT = path.resolve(__dirname, '../../public/assets/img/app');
const CAP = { direcao: 2000, projecao: 1600, relatorio: 1240, individual: 1240, certificado: 1600 }; // others: 780
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'index.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'scr-'));
  for (const id of ['hoje', 'desafios', 'diario', 'resultados', 'direcao', 'relatorio', 'individual', 'certificado', 'projecao']) {
    const png = path.join(tmp, id + '.png');
    await (await p.$('#s-' + id)).screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image\nim=Image.open(r'${png}').convert('RGB')\nw,h=im.size\nc=${CAP[id] || 780}\nim=im.resize((c,round(h*c/w)),Image.LANCZOS) if w>c else im\nim.save(r'${path.join(OUT, id + '.webp')}','WEBP',quality=82,method=6)`]);
    console.log('wrote', id + '.webp');
  }
  await b.close();
})();

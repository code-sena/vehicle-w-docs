// Renderiza bloques mermaid con las reglas del proyecto (ELK, codos de 90°, puentes, casos de uso UML).
//   const { open } = require('./lib'); const r = await open(); const res = await r.render(code, '/ruta/nombre'); await r.close();
// res = { ok, kind, w, h, cross, jumps, overlap, svgPath, pngPath } o { ok:false, err }
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');

async function open() {
  const browser = await chromium.launch({ channel: process.env.BROWSER || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#fff;margin:16px"><div id="d"></div></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, 'mermaid-elk.js') });
  await page.addScriptTag({ path: path.join(__dirname, 'uc.js') });
  await page.addScriptTag({ content: `window.HTML_LABELS = ${process.env.HTML_LABELS !== '0'};` });
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'post.js'), 'utf8') });
  let n = 0;
  return {
    async render(code, base) {
      const res = await page.evaluate(async ({ code, id }) => window.renderOne(code, id), { code, id: 'g' + (++n) });
      if (!res.ok) return res;
      fs.mkdirSync(path.dirname(base), { recursive: true });
      const svgPath = base + '.svg', pngPath = base + '.png';
      fs.writeFileSync(svgPath, res.svg);
      await page.locator('#d svg').screenshot({ path: pngPath });
      delete res.svg;
      return { ...res, svgPath, pngPath };
    },
    close: () => browser.close(),
  };
}
const blocksOf = (md) => [...md.split(String.fromCharCode(13)).join('').matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
module.exports = { open, blocksOf };

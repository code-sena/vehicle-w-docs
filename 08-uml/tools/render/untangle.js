// node untangle.js <archivo.md> <número de bloque (1..n)> [intentos]
// Prueba órdenes distintos de las declaraciones (clases/entidades y relaciones) del bloque y deja el
// primero sin cruces ni superposiciones. El contenido no cambia: solo el orden de las líneas.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { open, blocksOf } = require('./lib');
const [file, nArg, triesArg] = process.argv.slice(2);
const tries = +(triesArg || 60);
function split(code) {
  const L = code.split('\n'); const head = [L[0]]; const units = []; const rels = []; let i = 1;
  while (i < L.length && /^\s*(direction |%%)/.test(L[i])) head.push(L[i++]);
  while (i < L.length) {
    const l = L[i];
    if (/^\s*(class\s+)?[\w~]+\s*\{/.test(l) && !/\}\s*$/.test(l)) { const u = [l]; i++; while (i < L.length && !/\}\s*$/.test(L[i])) u.push(L[i++]); u.push(L[i++]); units.push(u.join('\n')); }
    else if (/^\s*(class\s+)?[\w~]+\s*\{.*\}\s*$/.test(l)) { units.push(l); i++; }
    else if (/(--|\.\.|\|\||\}\||\|\{|o\{|\}o)/.test(l)) { rels.push(l); i++; }
    else if (l.trim()) { units.push(l); i++; } else i++;
  }
  return { head, units, rels };
}
const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
(async () => {
  const raw = fs.readFileSync(file, 'utf8'); const crlf = raw.includes('\r\n'); const md = raw.split('\r').join('');
  const blocks = blocksOf(md); const k = +nArg - 1; const code = blocks[k];
  const { head, units, rels } = split(code);
  const r = await open(); const tmp = path.join(os.tmpdir(), 'untangle');
  let best = null;
  for (let t = 0; t < tries; t++) {
    const g = rng(1000 + t);
    const cand = t === 0 ? code : [...head, ...shuffle(units, g), ...shuffle(rels, g), ''].join('\n');
    const res = await r.render(cand, path.join(tmp, 'c' + t));
    if (!res.ok) { if (process.env.DBG) console.log('err', t, res.err); continue; }
    if (process.env.DBG) console.log(t, res.cross, res.overlap);
    const score = res.cross * 10 + res.overlap * 100 + res.h / 1000 + res.w / 2000;
    if (!best || score < best.score) best = { score, cand, res, t };
    if (res.cross === 0 && res.overlap === 0 && t > 0 && best.cand === cand) break;
  }
  await r.close();
  console.log(`mejor intento ${best.t}: cruces=${best.res.cross} superpuestos=${best.res.overlap} ${best.res.w}x${best.res.h}`);
  if (best.t === 0) return;
  // reemplaza el bloque k en el archivo
  let idx = -1, out = md.replace(/```mermaid\n([\s\S]*?)```/g, (m) => (++idx === k ? '```mermaid\n' + best.cand.replace(/\n+$/, '\n') + '```' : m));
  fs.writeFileSync(file, crlf ? out.split('\n').join('\r\n') : out);
  console.log('guardado');
})();

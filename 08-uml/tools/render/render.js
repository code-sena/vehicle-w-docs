// node render.js <carpeta de salida> <archivo.md>...
// Dibuja cada bloque mermaid con las reglas del proyecto, guarda el PNG (y el SVG con KEEP_SVG=1) e informa
// lo que haya que revisar: cruces (ya con puente) y líneas o cajas que se montan.
// Navegador: Edge por defecto; con BROWSER=chrome usa Chrome.
const path = require('node:path'), fs = require('node:fs');
const { open, blocksOf } = require('./lib');
(async () => {
  const out = process.argv[2]; const files = process.argv.slice(3);
  const r = await open(); let bad = 0, warn = 0, n = 0;
  for (const f of files) {
    const blocks = blocksOf(fs.readFileSync(f, 'utf8'));
    for (let i = 0; i < blocks.length; i++) {
      n++;
      const name = (process.env.PREFIX || '') + path.basename(f, '.md') + (blocks.length > 1 ? `-${i + 1}` : '');
      const res = await r.render(blocks[i], path.join(out, name));
      if (!res.ok) { bad++; console.log('ERROR', name, res.err); continue; }
      if (!process.env.KEEP_SVG) fs.rmSync(res.svgPath, { force: true }); // en exports solo van los PNG
      const w = res.cross || res.overlap; if (w) warn++;
      console.log(w ? 'REVISAR' : 'ok', name, res.kind, `${res.w}x${res.h}`, `cruces=${res.cross} puentes=${res.jumps} superpuestos=${res.overlap}`);
    }
  }
  await r.close();
  console.log(`${n} diagramas, ${bad} con error, ${warn} por revisar`);
})();

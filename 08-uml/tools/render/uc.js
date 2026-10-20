// Diagrama de casos de uso UML a partir de un flowchart mermaid con la convención del proyecto:
// nodos con "class ... actor" son actores, nodos (["..."]) son casos de uso, subgraph = paquete,
// "---" asociación, "-. «include» .->" y "-. «extend» .->" relaciones entre casos.
// Actor principal a la izquierda, secundarios a la derecha, casos en una columna dentro del sistema.
(function () {
  const F = 13, FONT = `${F}px Arial, Helvetica, sans-serif`;
  const ctx = document.createElement('canvas').getContext('2d');
  const tw = (s, f = FONT) => { ctx.font = f; return ctx.measureText(s).width; };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function wrap(s, max) {
    const words = s.split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (tw(t) > max && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function parse(code) {
    const nodes = new Map(), order = [], groups = [], edges = [], actors = new Set();
    let grp = null;
    const label = (s) => s.replace(/^\(\[|\]\)$|^\[|\]$|^\(|\)$/g, '').replace(/^"|"$/g, '');
    const def = (id, raw) => {
      if (!nodes.has(id)) { nodes.set(id, { id, text: id, group: null }); order.push(id); }
      const n = nodes.get(id); if (raw) n.text = label(raw.trim()).replace(/<br\s*\/?>/g, ' ');
      if (grp && !n.group) { n.group = grp; grp.items.push(id); }
      return n;
    };
    const tok = /([A-Za-z_][\w]*)\s*(\(\[[^\]]*\]\)|\["[^"]*"\]|\[[^\]]*\]|\(\[.*?\]\))?/;
    for (let line of code.split('\n')) {
      line = line.trim(); if (!line || line.startsWith('%%') || /^(flowchart|graph)\b/.test(line) || line.startsWith('classDef') || line.startsWith('style ') || line.startsWith('direction')) continue;
      let m;
      if ((m = line.match(/^subgraph\s+(\w+)\s*(?:\["?([^"\]]*)"?\])?/))) { grp = { id: m[1], title: m[2] || m[1], items: [] }; groups.push(grp); continue; }
      if (line === 'end') { grp = null; continue; }
      if ((m = line.match(/^class\s+([\w,]+)\s+actor/))) { m[1].split(',').forEach((a) => actors.add(a)); continue; }
      m = line.match(/^(.+?)\s*(-{3}|-\.\s*"([^"]*)"\s*\.-+>?|-\.-+>?|-->|---)\s*(.+)$/);
      if (m) {
        const a = m[1].match(tok), b = m[4].match(tok);
        const na = def(a[1], a[2]), nb = def(b[1], b[2]);
        edges.push({ from: na.id, to: nb.id, label: m[3] || '', dashed: m[2].startsWith('-.'), arrow: m[2].endsWith('>') });
        continue;
      }
      if ((m = line.match(tok)) && m[2]) def(m[1], m[2]);
    }
    return { nodes, order, groups, edges, actors };
  }

  window.renderUseCase = function (code) {
    const g = parse(code);
    const actorIds = g.order.filter((id) => g.actors.has(id));
    const ucIds = g.order.filter((id) => !g.actors.has(id));
    const left = actorIds.slice(0, 1), right = actorIds.slice(1);
    // orden de los casos: por paquete, en el orden en que aparecen
    const seq = []; const seen = new Set();
    for (const id of ucIds) {
      const n = g.nodes.get(id);
      if (n.group) { if (!seen.has(n.group.id)) { seen.add(n.group.id); n.group.items.filter((x) => !g.actors.has(x)).forEach((x) => seq.push(x)); } }
      else seq.push(id);
    }
    const OW = Math.min(300, Math.max(170, ...seq.map((id) => tw(g.nodes.get(id).text) + 44)));
    const lines = Object.fromEntries(seq.map((id) => [id, wrap(g.nodes.get(id).text, OW - 40)]));
    const OH = (id) => Math.max(40, lines[id].length * (F + 3) + 18);
    const assocL = g.edges.filter((e) => !e.arrow && (left.includes(e.from) || left.includes(e.to)));
    const assocR = g.edges.filter((e) => !e.arrow && (right.includes(e.from) || right.includes(e.to)));
    const rels = g.edges.filter((e) => e.arrow);
    // carriles verticales a la derecha para include/extend, el más corto más cerca de la columna
    const pos = {};
    // geometría vertical
    let y = 64; const GAP = 16; const frames = [];
    let lastGroup = null;
    for (const id of seq) {
      const n = g.nodes.get(id);
      if (n.group !== lastGroup) {
        if (lastGroup) { frames[frames.length - 1].y2 = y - GAP + 8; y += 12; }
        if (n.group) { frames.push({ title: n.group.title, y1: y }); y += 26; } else if (lastGroup) y += 4;
        lastGroup = n.group;
      }
      pos[id] = { cy: y + OH(id) / 2, h: OH(id) }; y += OH(id) + GAP;
    }
    if (lastGroup) frames[frames.length - 1].y2 = y - GAP + 8;
    const bottom = y + (lastGroup ? 12 : 0);
    const nLeft = left.length;
    const ACT = 70; // ancho de la zona del actor
    const nameW = Math.max(40, ...left.map((a) => Math.max(...wrap(g.nodes.get(a).text, ACT + 30).map((s) => tw(s, `bold ${F}px Arial`)))));
    const AX = Math.max(40, nameW / 2 + 10);
    const boxL = AX + 90;
    const lblL = Math.max(0, ...assocL.filter((e) => e.label).map((e) => tw(e.label, `italic ${F - 2}px Arial`)));
    const colX = boxL + 50 + 18 * Math.max(0, nLeft - 1) + (lblL ? lblL + 4 : 0); // borde izquierdo de los óvalos
    const bundles = [];
    for (const r of rels) { let b = bundles.find((x) => x.from === r.from && x.label === r.label);
      if (!b) { b = { from: r.from, label: r.label, rels: [] }; bundles.push(b); } b.rels.push(r); }
    const span = (b) => { const ys = [b.from, ...b.rels.map((r) => r.to)].map((id) => pos[id].cy); return Math.max(...ys) - Math.min(...ys); };
    bundles.sort((a, b) => span(a) - span(b));
    const laneX0 = colX + OW + 26;
    let lx = laneX0;
    bundles.forEach((b) => { b.lane = lx; b.rels.forEach((r) => { r.lane = lx; r.bundle = b; }); lx += tw(b.label, `italic ${F - 1}px Arial`) + 22; });
    const lanesEnd = bundles.length ? lx : colX + OW;
    const boxR = Math.max(colX + OW + 40, lanesEnd + 20) + (right.length ? 30 : 0);
    const W = boxR + (right.length ? ACT + 60 : 30);
    const H = bottom + 40;
    for (const id of seq) { pos[id].x1 = colX; pos[id].x2 = colX + OW; pos[id].cx = colX + OW / 2; }
    // puntos de enganche en el borde derecho de cada óvalo, repartidos para no montarse
    const rightAtt = {}; const addR = (id, key) => { (rightAtt[id] = rightAtt[id] || []).push(key); };
    bundles.forEach((b, k) => addR(b.from, 'o' + k)); rels.forEach((r, k) => addR(r.to, 'i' + k));
    assocR.forEach((e, k) => addR(right.includes(e.from) ? e.to : e.from, 'r' + k));
    const attY = (id, key) => { const L = rightAtt[id]; const i = L.indexOf(key), n = L.length; const h = pos[id].h * 0.5;
      return n === 1 ? pos[id].cy : pos[id].cy - h / 2 + (h * i) / (n - 1); };
    const ellX = (id, yy, side) => { const p = pos[id]; const a = OW / 2, b = p.h / 2; const dy = yy - p.cy;
      return p.cx + side * a * Math.sqrt(Math.max(0, 1 - (dy * dy) / (b * b))); };

    const out = []; const paths = [];
    out.push(`<rect x="${boxL}" y="20" width="${boxR - boxL}" height="${bottom - 20 + 14}" fill="#fff" stroke="#333" stroke-width="1.3"/>`);
    out.push(`<text x="${(boxL + boxR) / 2}" y="42" text-anchor="middle" font-weight="bold" font-size="${F + 1}">LavaRápido</text>`);
    for (const f of frames) {
      out.push(`<rect x="${colX - 26}" y="${f.y1}" width="${OW + 52}" height="${f.y2 - f.y1}" fill="#fafafa" stroke="#999" stroke-dasharray="5 3" rx="3"/>`);
      out.push(`<text x="${colX - 18}" y="${f.y1 + 17}" font-size="${F - 1}" fill="#444" font-weight="bold">${esc(f.title)}</text>`);
    }
    for (const id of seq) {
      const p = pos[id];
      out.push(`<ellipse cx="${p.cx}" cy="${p.cy}" rx="${OW / 2}" ry="${p.h / 2}" fill="#f2f2f2" stroke="#333" stroke-width="1.2"/>`);
      const L = lines[id]; L.forEach((t, i) => out.push(`<text x="${p.cx}" y="${p.cy - ((L.length - 1) * (F + 3)) / 2 + i * (F + 3) + 4.5}" text-anchor="middle">${esc(t)}</text>`));
    }
    const actor = (id, x, yc) => {
      const name = wrap(g.nodes.get(id).text, ACT + 30);
      out.push(`<g stroke="#222" stroke-width="1.6" fill="none"><circle cx="${x}" cy="${yc - 22}" r="8" fill="#fff"/><line x1="${x}" y1="${yc - 14}" x2="${x}" y2="${yc + 8}"/><line x1="${x - 13}" y1="${yc - 6}" x2="${x + 13}" y2="${yc - 6}"/><line x1="${x}" y1="${yc + 8}" x2="${x - 10}" y2="${yc + 24}"/><line x1="${x}" y1="${yc + 8}" x2="${x + 10}" y2="${yc + 24}"/></g>`);
      name.forEach((t, i) => out.push(`<text x="${x}" y="${yc + 42 + i * (F + 2)}" text-anchor="middle" font-weight="bold">${esc(t)}</text>`));
    };
    // actores de la izquierda: tronco vertical y ramas horizontales
    left.forEach((a, k) => {
      const mine = assocL.filter((e) => e.from === a || e.to === a).map((e) => ({ id: e.from === a ? e.to : e.from, label: e.label, dashed: e.dashed }));
      const ys = mine.map((m) => pos[m.id].cy); const ys0 = (Math.min(...ys) + Math.max(...ys)) / 2;
      const yc = ys0 + 6; const ax = AX; actor(a, ax, yc);
      const trunk = boxL + 22 + k * 18;
      paths.push({ pts: [[ax + 16, ys0], [trunk, ys0]], dashed: false, arrow: false });
      if (ys.length > 1) paths.push({ pts: [[trunk, Math.min(...ys)], [trunk, Math.max(...ys)]], dashed: false, arrow: false });
      for (const m of mine) {
        const yy = pos[m.id].cy;
        paths.push({ pts: [[trunk, yy], [ellX(m.id, yy, -1), yy]], dashed: false, arrow: false });
        if (m.label) out.push(`<text x="${trunk + 6}" y="${yy - 6}" font-size="${F - 2}" font-style="italic" fill="#333">${esc(m.label)}</text>`);
      }
    });
    // actores de la derecha
    right.forEach((a, k) => {
      const mine = assocR.map((e, i) => ({ e, i })).filter(({ e }) => e.from === a || e.to === a);
      const ys = mine.map(({ e, i }) => attY(e.from === a ? e.to : e.from, 'r' + i)); const ys0 = (Math.min(...ys) + Math.max(...ys)) / 2;
      const ax = boxR + 50 + k * 0; actor(a, ax, ys0 + 6);
      const trunk = boxR - 18 - k * 18;
      paths.push({ pts: [[ax - 16, ys0], [trunk, ys0]], dashed: false, arrow: false });
      if (ys.length > 1) paths.push({ pts: [[trunk, Math.min(...ys)], [trunk, Math.max(...ys)]], dashed: false, arrow: false });
      for (const { e, i } of mine) {
        const id = e.from === a ? e.to : e.from; const yy = attY(id, 'r' + i);
        paths.push({ pts: [[trunk, yy], [ellX(id, yy, 1), yy]], dashed: false, arrow: false });
        if (e.label) out.push(`<text x="${trunk - 6}" y="${yy - 5}" text-anchor="end" font-size="${F - 2}" font-style="italic" fill="#333">${esc(e.label)}</text>`);
      }
    });
    // include / extend por carriles a la derecha de la columna
    bundles.forEach((b, k) => {
      const y1 = attY(b.from, 'o' + k); const ys = [y1];
      b.rels.forEach((r) => { const k2 = rels.indexOf(r); const y2 = attY(r.to, 'i' + k2); ys.push(y2);
        paths.push({ pts: [[ellX(b.from, y1, 1), y1], [b.lane, y1], [b.lane, y2], [ellX(r.to, y2, 1), y2]], dashed: true, arrow: true }); });
      const lo = Math.min(...ys), hi = Math.max(...ys);
      out.push(`<text x="${b.lane + 5}" y="${(lo + hi) / 2 + 4}" font-size="${F - 1}" font-style="italic" fill="#333">${esc(b.label)}</text>`);
    });
    const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif" font-size="${F}" fill="#111">`,
      `<defs><marker id="ucarr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="#333" stroke-width="1.5"/></marker></defs>`,
      `<rect width="${W}" height="${H}" fill="#fff"/>`, ...out,
      ...paths.map((p) => `<path class="flowchart-link" d="M${p.pts.map((q) => q.join(',')).join(' L')}" fill="none" stroke="#333" stroke-width="1.2"${p.dashed ? ' stroke-dasharray="6 4"' : ''}${p.arrow ? ' marker-end="url(#ucarr)"' : ''}/>`),
      `</svg>`];
    return svg.join('\n');
  };
})();

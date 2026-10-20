// Se carga en la página junto a mermaid-elk.js. renderOne(code, id) dibuja un bloque mermaid con
// líneas rectas y codos de 90°, pone puentes donde dos líneas se cruzan y mide los problemas que quedan.
(function () {
  const R = 5; // radio del puente
  const BASE = {
    startOnLoad: false, securityLevel: 'loose', theme: 'neutral', look: 'classic',
    fontFamily: 'Arial, Helvetica, sans-serif',
    htmlLabels: (window.HTML_LABELS !== false), flowchart: { curve: 'linear', htmlLabels: (window.HTML_LABELS !== false), wrappingWidth: 300, padding: 12, nodeSpacing: 45, rankSpacing: 55 },
    state: { curve: 'linear' }, class: { curve: 'linear' }, er: { curve: 'linear', useMaxWidth: false },
    sequence: { mirrorActors: false, showSequenceNumbers: false },
    elk: { mergeEdges: false, nodePlacementStrategy: 'BRANDES_KOEPF', cycleBreakingStrategy: (window.CB || 'DEPTH_FIRST') },
  };
  function kindOf(code) {
    const l = code.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('%%'));
    let i = 0;
    if (l[0] === '---') { i = l.indexOf('---', 1) + 1; }
    return (l[i] || '').split(/\s/)[0];
  }
  const ELK = ['flowchart', 'graph', 'stateDiagram-v2', 'stateDiagram', 'classDiagram', 'erDiagram'];

  function pts(d) { // puntos de un path compuesto por M/L/H/V (absolutos)
    const p = []; const re = /([MLHVZ])([^MLHVZ]*)/gi; let m, x = 0, y = 0;
    while ((m = re.exec(d))) {
      const c = m[1].toUpperCase(); const v = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (c === 'M' || c === 'L') for (let k = 0; k + 1 < v.length; k += 2) { x = v[k]; y = v[k + 1]; p.push([x, y]); }
      else if (c === 'H') { x = v[v.length - 1]; p.push([x, y]); } else if (c === 'V') { y = v[v.length - 1]; p.push([x, y]); }
    }
    return p;
  }
  function decodePoints(el) {
    const a = el.getAttribute('data-points'); if (!a) return null;
    try { return JSON.parse(atob(a)).map((q) => [q.x, q.y]); } catch { return null; }
  }
  function ortho(p) { // convierte una polilínea cualquiera en una con solo tramos horizontales y verticales
    const o = [p[0]];
    for (let k = 1; k < p.length; k++) {
      const [x0, y0] = o[o.length - 1], [x1, y1] = p[k];
      if (Math.abs(x0 - x1) > 0.5 && Math.abs(y0 - y1) > 0.5) {
        // codo: primero en el eje de mayor recorrido del tramo anterior
        const prev = o.length > 1 ? o[o.length - 2] : null;
        const prevVertical = prev && Math.abs(prev[0] - x0) < 0.5;
        o.push(prevVertical ? [x0, y1] : [x1, y0]);
      }
      o.push([x1, y1]);
    }
    // quita puntos repetidos y colineales
    const c = [o[0]];
    for (let k = 1; k < o.length; k++) {
      const a = c[c.length - 1]; if (Math.abs(a[0] - o[k][0]) < 0.5 && Math.abs(a[1] - o[k][1]) < 0.5) continue;
      if (c.length > 1) { const z = c[c.length - 2];
        if ((Math.abs(z[0] - a[0]) < 0.5 && Math.abs(a[0] - o[k][0]) < 0.5) || (Math.abs(z[1] - a[1]) < 0.5 && Math.abs(a[1] - o[k][1]) < 0.5)) { c[c.length - 1] = o[k]; continue; } }
      c.push(o[k]);
    }
    return c;
  }
  function segs(p, e) { const s = []; for (let k = 1; k < p.length; k++) s.push({ a: p[k - 1], b: p[k], e, k }); return s; }
  const H = (s) => Math.abs(s.a[1] - s.b[1]) < 0.5;
  const V = (s) => Math.abs(s.a[0] - s.b[0]) < 0.5;
  const between = (v, a, b, m) => v > Math.min(a, b) + m && v < Math.max(a, b) - m;

  function process(svg, kind) {
    const stats = { cross: 0, jumps: 0, curves: 0, overlap: 0 };
    if (kind === 'sequenceDiagram') { // mensajes a sí mismo: rectángulo en vez de curva
      svg.querySelectorAll('path.messageLine0, path.messageLine1').forEach((el) => {
        const d = el.getAttribute('d'); if (!/[CQ]/i.test(d)) return;
        const n = d.match(/-?\d+(\.\d+)?/g).map(Number); const x = n[0], y = n[1], y2 = n[n.length - 1];
        el.setAttribute('d', `M${x},${y} H${x + 34} V${y2} H${x}`);
        // el texto del mensaje a sí mismo va a la derecha del rectángulo, sin tapar el número del paso
        let best = null;
        svg.querySelectorAll('text.messageText').forEach((t) => {
          const tx = +t.getAttribute('x'), ty = +t.getAttribute('y');
          if (Math.abs(tx - x) < 4 && ty <= y + 2 && y - ty < 40 && (!best || ty > +best.getAttribute('y'))) best = t;
        });
        if (best) { best.setAttribute('x', x + 42); best.setAttribute('y', Math.min(y, y2) - 3); best.style.textAnchor = 'start'; }
      });
      return stats;
    }
    const edges = [...svg.querySelectorAll('path.flowchart-link, g.edgePaths path, path.relation, path.transition, .edges path')]
      .filter((el, i, a) => a.indexOf(el) === i && !el.closest('marker')
        && !/invisible/.test(el.getAttribute('class') || '') && getComputedStyle(el).stroke !== 'none');
    const polys = edges.map((el) => {
      let p = decodePoints(el); const d = el.getAttribute('d') || '';
      if (/[CQSTA]/i.test(d)) stats.curves++;
      if (!p) p = pts(d.replace(/[CQST][^MLHVZCQSTA]*/gi, ''));
      // el path real puede estar recortado en los bordes de la caja: usa sus extremos reales
      const real = pts(d.replace(/[CQST][^MLHVZCQSTA]*/gi, ''));
      if (real.length >= 2 && p.length >= 2) { p[0] = real[0]; p[p.length - 1] = real[real.length - 1]; }
      return ortho(p);
    });
    // flechas que llegan casi al mismo punto: se juntan en un tramo común antes de la punta
    const used = new Set();
    polys.forEach((p, i) => {
      if (kind === 'usecase' || used.has(i) || p.length < 2) return;
      const end = p[p.length - 1];
      const grp = polys.map((q, j) => j).filter((j) => { const e = polys[j][polys[j].length - 1];
        return Math.hypot(e[0] - end[0], e[1] - end[1]) < 16 && polys[j].length >= 2; });
      if (grp.length < 2) return;
      grp.forEach((j) => used.add(j));
      const last = (q) => [q[q.length - 2], q[q.length - 1]];
      const horiz = grp.every((j) => { const [a, b] = last(polys[j]); return Math.abs(a[1] - b[1]) < 0.5; });
      const vert = grp.every((j) => { const [a, b] = last(polys[j]); return Math.abs(a[0] - b[0]) < 0.5; });
      if (!horiz && !vert) return;
      const ends = grp.map((j) => polys[j][polys[j].length - 1]);
      const cx = ends.reduce((s, e) => s + e[0], 0) / ends.length, cy = ends.reduce((s, e) => s + e[1], 0) / ends.length;
      if (horiz) {
        const dir = Math.sign(ends[0][0] - last(polys[grp[0]])[0][0]) || 1;
        const tip = dir > 0 ? Math.min(...ends.map((e) => e[0])) : Math.max(...ends.map((e) => e[0]));
        const elb = grp.map((j) => polys[j][polys[j].length - 2][0]).filter((x) => dir * (tip - x) > 12);
        const jx = elb.length ? (dir > 0 ? Math.max(...elb) : Math.min(...elb)) : tip - dir * 18;
        grp.forEach((j) => { const q = polys[j]; const y = q[q.length - 2][1];
          q.splice(q.length - 1, 1, [jx, y], [jx, cy], [tip, cy]); polys[j] = ortho(q); });
      } else {
        const dir = Math.sign(ends[0][1] - last(polys[grp[0]])[0][1]) || 1;
        const tip = dir > 0 ? Math.min(...ends.map((e) => e[1])) : Math.max(...ends.map((e) => e[1]));
        const elb = grp.map((j) => polys[j][polys[j].length - 2][1]).filter((y) => dir * (tip - y) > 12);
        const jy = elb.length ? (dir > 0 ? Math.max(...elb) : Math.min(...elb)) : tip - dir * 18;
        grp.forEach((j) => { const q = polys[j]; const x = q[q.length - 2][0];
          q.splice(q.length - 1, 1, [x, jy], [cx, jy], [cx, tip]); polys[j] = ortho(q); });
      }
    });
    // cruces: tramo horizontal de una línea contra tramo vertical de otra
    const all = polys.flatMap((p, e) => segs(p, e));
    const jumpsByEdge = new Map();
    for (const h of all.filter(H)) for (const v of all.filter(V)) {
      if (h.e === v.e) continue;
      const x = v.a[0], y = h.a[1];
      if (between(x, h.a[0], h.b[0], R + 1) && between(y, v.a[1], v.b[1], 1)) {
        stats.cross++;
        if (!jumpsByEdge.has(h.e)) jumpsByEdge.set(h.e, []);
        jumpsByEdge.get(h.e).push({ k: h.k, x, y });
      }
    }
    // tramos superpuestos de líneas distintas que no salen ni llegan al mismo nodo
    const ends = polys.map((p) => [p[0], p[p.length - 1]].map((q) => q.map(Math.round).join(',')));
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const s = all[i], t = all[j]; if (s.e === t.e) continue;
      const shared = ends[s.e].some((x) => ends[t.e].includes(x));
      if (shared) continue;
      if (H(s) && H(t) && Math.abs(s.a[1] - t.a[1]) < 2) {
        const lo = Math.max(Math.min(s.a[0], s.b[0]), Math.min(t.a[0], t.b[0])), hi = Math.min(Math.max(s.a[0], s.b[0]), Math.max(t.a[0], t.b[0]));
        if (hi - lo > 4) stats.overlap++;
      } else if (V(s) && V(t) && Math.abs(s.a[0] - t.a[0]) < 2) {
        const lo = Math.max(Math.min(s.a[1], s.b[1]), Math.min(t.a[1], t.b[1])), hi = Math.min(Math.max(s.a[1], s.b[1]), Math.max(t.a[1], t.b[1]));
        if (hi - lo > 4) stats.overlap++;
      }
    }
    // reescribe cada línea: rectas, codos de 90° y puentes
    edges.forEach((el, e) => {
      const p = polys[e]; const js = jumpsByEdge.get(e) || [];
      let d = `M${p[0][0]},${p[0][1]}`;
      for (let k = 1; k < p.length; k++) {
        const [x0, y0] = p[k - 1], [x1, y1] = p[k]; const dir = Math.sign(x1 - x0);
        const here = js.filter((j) => j.k === k).sort((a, b) => dir * (a.x - b.x));
        for (const j of here) {
          d += ` L${j.x - dir * R},${y0} A${R},${R} 0 0 ${dir > 0 ? 1 : 0} ${j.x + dir * R},${y0}`;
          stats.jumps++;
        }
        d += ` L${x1},${y1}`;
      }
      el.setAttribute('d', d);
      el.style.strokeLinejoin = 'miter';
    });
    // tramos en coordenadas de pantalla, para compararlos con cajas y títulos
    const scr = [];
    edges.forEach((el, e) => {
      const m = el.getScreenCTM(); if (!m) return;
      const p = polys[e].map(([x, y]) => { const q = new DOMPoint(x, y).matrixTransform(m); return [q.x, q.y]; });
      for (let k = 1; k < p.length; k++) scr.push({ a: p[k - 1], b: p[k], e });
    });
    const hits = (s, b, m) => {
      const x1 = Math.min(s.a[0], s.b[0]), x2 = Math.max(s.a[0], s.b[0]), y1 = Math.min(s.a[1], s.b[1]), y2 = Math.max(s.a[1], s.b[1]);
      return x2 > b.left + m && x1 < b.right - m && y2 > b.top + m && y1 < b.bottom - m;
    };
    // títulos de grupo: se dejan a la izquierda, al centro o a la derecha, donde ninguna línea los toque
    svg.querySelectorAll('g.cluster').forEach((c) => {
      const lab = c.querySelector(':scope > g.cluster-label, :scope > .cluster-label'); const rect = c.querySelector(':scope > rect');
      if (!lab || !rect) return;
      const t = lab.getAttribute('transform') || ''; const mm = t.match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/); if (!mm) return;
      const y = +mm[2]; const x0 = +mm[1]; const rx = +rect.getAttribute('x'), rw = +rect.getAttribute('width');
      const lw = lab.getBBox().width;
      const clear = () => { const b = lab.getBoundingClientRect(); return !scr.some((s) => hits(s, b, -2)); };
      if (clear()) return;
      for (const nx of [rx + 10, rx + rw - lw - 10, x0]) { lab.setAttribute('transform', `translate(${nx}, ${y})`); if (clear()) return; }
      stats.overlap++; // ninguna posición quedó libre
    });
    // líneas que atraviesan una caja que no es la suya
    // se prueba contra la figura real (rombo, círculo, caja), no contra su rectángulo envolvente
    const shapes = [...svg.querySelectorAll('g.node')].map((g) => g.querySelector('rect, polygon, circle, ellipse, path'))
      .filter((s) => s && typeof s.isPointInFill === 'function').map((s) => ({ s, b: s.getBoundingClientRect(), inv: s.getScreenCTM() && s.getScreenCTM().inverse() }))
      .filter((o) => o.inv && o.b.width > 2);
    const crossed = new Set();
    for (const seg of scr) {
      const len = Math.hypot(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
      for (const o of shapes) {
        if (!hits(seg, o.b, 1)) continue;
        for (let d = 5; d < len - 5; d += 3) {
          const t = d / len; const p = new DOMPoint(seg.a[0] + (seg.b[0] - seg.a[0]) * t, seg.a[1] + (seg.b[1] - seg.a[1]) * t).matrixTransform(o.inv);
          if (o.s.isPointInFill(p)) { crossed.add(seg.e + ':' + shapes.indexOf(o)); break; }
        }
      }
    }
    stats.overlap += crossed.size;
    // cajas: nodos o etiquetas que se montan entre sí
    const boxes = [...svg.querySelectorAll('g.node, g.edgeLabel, g.cluster-label')]
      .map((g) => g.getBoundingClientRect()).filter((b) => b.width > 2 && b.height > 2);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 3 && oy > 3) {
        const inside = (u, w) => u.left >= w.left - 1 && u.right <= w.right + 1 && u.top >= w.top - 1 && u.bottom <= w.bottom + 1;
        if (!inside(a, b) && !inside(b, a)) stats.overlap++;
      }
    }
    return stats;
  }

  window.renderOne = async function (code, id) {
    try {
      const kind = kindOf(code);
      if (/classDef actor[\s,]/.test(code) && /\(\["/.test(code)) {
        const host = document.getElementById('d'); host.innerHTML = window.renderUseCase(code);
        const el = host.querySelector('svg'); const stats = process(el, 'usecase');
        const box = el.getBoundingClientRect();
        return { ok: true, kind: 'usecase', svg: el.outerHTML, w: Math.round(box.width), h: Math.round(box.height), ...stats };
      }
      var umlStart = [], umlEnd = [];
      // actividad UML: nodo "Start/Inicio" = círculo negro, "End/Fin" = círculo con anillo
      if (kind === 'flowchart' || kind === 'graph') {
        const marks = [];
        code = code.replace(/\b([A-Za-z_][\w]*)\s*(?:\(\(|\(\[)\s*"?(Start|Inicio|End|Fin)"?\s*(?:\)\)|\]\))/g, (m, id, w) => {
          const s = /^(Start|Inicio)$/.test(w);
          (s ? umlStart : umlEnd).push(id); marks.push(`    ${id}@{ shape: circle, label: " " }`); return id;
        });
        if (marks.length) { const L = code.split('\n'); const i = L.findIndex((l) => /^\s*(flowchart|graph)\b/.test(l)); L.splice(i + 1, 0, ...[...new Set(marks)]); code = L.join('\n'); }
      }
      // "%% grid: N" en un diagrama de clases: las clases se acomodan en N columnas, en el orden en que
      // se declaran, con líneas guía que después se ocultan (solo sirven para el acomodo)
      const hidden = [];
      // "%% grid: S+P": S columnas para los servicios de aplicación y P para el resto (puertos), a la derecha
      const gm = kind === 'classDiagram' && code.match(/%%\s*grid:\s*(\d+)\+(\d+)/);
      if (gm) {
        const all = [...code.matchAll(/^\s*class\s+(\w+)\s*\{\s*\n\s*<<([^>]+)>>/gm)].map((m) => ({ n: m[1], s: m[2] }));
        const svc = all.filter((x) => x.s === 'application service').map((x) => x.n);
        const rest = all.filter((x) => x.s !== 'application service').map((x) => x.n);
        const R = Math.max(Math.ceil(svc.length / +gm[1]), Math.ceil(rest.length / +gm[2]));
        const chain = (L) => { for (let i = 0; i + R < L.length; i++) hidden.push([L[i], L[i + R]]); };
        chain(svc); chain(rest);
        const lastStart = Math.floor((svc.length - 1) / R) * R;
        for (let j = 0; j < Math.min(R, rest.length); j++) hidden.push([svc[Math.min(lastStart + j, svc.length - 1)], rest[j]]);
        code += '\n' + hidden.map(([a, b]) => `  ${a} --> ${b}`).join('\n');
      }
      const cfg = JSON.parse(JSON.stringify(BASE));
      if (ELK.includes(kind) && !/layout:\s*dagre/.test(code)) cfg.layout = 'elk';
      mermaid.initialize(cfg);
      await mermaid.parse(code);
      const { svg } = await mermaid.render(id, code);
      const host = document.getElementById('d'); host.innerHTML = svg;
      const el = host.querySelector('svg');
      // inicio: círculo negro; fin: anillo con punto negro (notación UML de actividad)
      const NS = 'http://www.w3.org/2000/svg';
      const paint = (id, end) => {
        const g = [...el.querySelectorAll('g.node')].find((n) => new RegExp('(^|-)flowchart-' + id + '-[0-9]+$').test(n.id)); if (!g) return;
        const b = g.getBBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        [...g.children].forEach((c) => c.remove());
        const r = Math.min(b.width, b.height) / 2 - 1;
        const c1 = document.createElementNS(NS, 'circle'); c1.setAttribute('cx', cx); c1.setAttribute('cy', cy); c1.setAttribute('r', r);
        c1.style.fill = end ? '#fff' : '#222'; c1.style.stroke = '#222'; c1.style.strokeWidth = '1.6'; g.appendChild(c1);
        if (end) { const c2 = document.createElementNS(NS, 'circle'); c2.setAttribute('cx', cx); c2.setAttribute('cy', cy); c2.setAttribute('r', r * 0.58); c2.style.fill = '#222'; c2.style.stroke = 'none'; g.appendChild(c2); }
      };
      umlStart.forEach((id) => paint(id, false)); umlEnd.forEach((id) => paint(id, true));
      for (const [a, b] of hidden) el.querySelectorAll('path.relation').forEach((p) => { if (new RegExp('-id_' + a + '_' + b + '_[0-9]+$').test(p.id)) p.remove(); });
      const stats = process(el, kind);
      const box = el.getBoundingClientRect();
      return { ok: true, kind, svg: el.outerHTML, w: Math.round(box.width), h: Math.round(box.height), ...stats };
    } catch (e) { return { ok: false, err: String((e && e.message) || e).split('\n').slice(0, 3).join(' | ') }; }
  };
})();

/* 11 · Calles OSM para el banner del sitio C (se ejecuta en la consola de un navegador con acceso a overpass-api.de).
   Consulta: vías highway motorway/trunk(+link), primary, secondary, tertiary en el bbox del banner.
   Base OSM usada: 2026-09-16T12:52:49Z (© colaboradores de OpenStreetMap, ODbL).
   Salida: filas RLE por grilla (letra A–E = clase 0–4, largo en base36) + hash por fila (mod 997) para verificar la copia.
   Las filas se guardan en pipeline/data/osm/calles_rle_{escritorio,movil}.txt y 12_integrar_calles.py las inserta en banner_grid_sitia.json. */
const q = `[out:json][timeout:120];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link)$"](-33.70,-71.32,-33.25,-70.20);out geom;`;
const ways = (await (await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q) })).json()).elements;
const CL = { motorway: 1, motorway_link: 1, trunk: 1, trunk_link: 1, primary: 2, secondary: 3, tertiary: 4 };
const grids = { escritorio: { cols: 300, rows: 117, bbox: [-71.3, -33.62, -70.22, -33.27] }, movil: { cols: 120, rows: 111, bbox: [-70.86, -33.62, -70.42, -33.28] } };
const h = s => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) % 997; return x; };
const salida = {};
for (const [k, g] of Object.entries(grids)) {
  const { cols, rows } = g, [lon0, lat0, lon1, lat1] = g.bbox, A = new Uint8Array(cols * rows);
  const cell = (lon, lat) => [Math.floor((lon - lon0) / (lon1 - lon0) * cols), Math.floor((lat1 - lat) / (lat1 - lat0) * rows)];
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const i = y * cols + x; if (!A[i] || c < A[i]) A[i] = c; };
  for (const w of ways) {
    const c = CL[w.tags.highway]; if (!c || !w.geometry) continue; let prev = null;
    for (const p of w.geometry) {
      const [x1, y1] = cell(p.lon, p.lat);
      if (prev) { let [x0, y0] = prev; const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
        if (dx <= cols && -dy <= rows) for (;;) { put(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } if (++n > 2000) break; } }
      else put(x1, y1, c);
      prev = [x1, y1];
    }
  }
  const s = Array.from(A).join(''), filas = [], hs = [];
  for (let y = 0; y < rows; y++) { const r = s.slice(y * cols, (y + 1) * cols); let o = '', i = 0; while (i < r.length) { let j = i; while (j < r.length && r[j] === r[i]) j++; o += 'ABCDE'[+r[i]] + (j - i === 1 ? '' : (j - i).toString(36)); i = j; } filas.push(o); hs.push(h(r)); }
  salida[k] = filas.join('\n') + '\n#' + hs.join(',');
}
salida;

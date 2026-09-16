/* DOBLE · banner pixel art: las cuatro comunas del gemelo, celda a celda, mes a mes */
(async function () {
  const root = document.getElementById('banner');
  if (!root) return;
  const [G, D] = await Promise.all([fetch('assets/banner_grid.json').then(r => r.json()), fetch('data.json').then(r => r.json())]);
  const $ = s => root.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const nf = new Intl.NumberFormat('es-CL');
  const pct = x => Math.round(100 * x) + '%';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* paleta de pantalla (fija en ambos temas; pasos oscuros validados para daltonismo) */
  const C = { vacio: '#0c0e13', trama: '#171a20', rm: '#1b1e24', borde: '#2e3139', piloto: '#e2e2e9', coincide: '#4f5563', fp: '#d95926', fn: '#3987e5', doble: '#ff8a80' };
  const RGB = Object.fromEntries(Object.entries(C).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));
  const ANCLA = { 'Santiago': 'end', 'La Pintana': 'end', 'Las Condes': 'start', 'Puente Alto': 'start' };

  const serie = {}; D.serie.forEach(s => (serie[s.comuna] ??= [])[s.mes] = s);
  const resumen = Object.fromEntries(D.resumen.map(r => [r.comuna, r]));
  const porIndice = Object.fromEntries(G.comunas.map(c => [c.i, c]));
  let modo = null, grid = null, M = null, mes = 0, jugando = !reduce, ultimo = 0, pausaHasta = 0, img = null;

  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

  function preparar() {
    const m = root.clientWidth < 640 ? 'movil' : 'escritorio';
    if (m === modo) return; modo = m; grid = G[m];
    const A = G.alfabeto; M = new Uint8Array(grid.cols * grid.rows);
    for (let k = 0; k < M.length; k++) M[k] = A.indexOf(grid.celdas[k]);
    cv.width = grid.cols; cv.height = grid.rows;
    img = ctx.createImageData(grid.cols, grid.rows);
    root.style.setProperty('--aspect', `${grid.cols} / ${grid.rows}`);
    // etiquetas
    const cap = $('.px-labels'); cap.innerHTML = '';
    G.comunas.filter(c => c.piloto).forEach(c => {
      const e = grid.etiquetas[c.cod]; if (!e) return;
      const d = document.createElement('div'); d.className = 'px-label ' + ANCLA[c.nombre]; d.dataset.comuna = c.nombre;
      d.style.left = (e.cx * 100) + '%'; d.style.top = (e.cy * 100) + '%';
      d.innerHTML = `<span class="n"></span><span class="v"></span>`; d.querySelector('.n').textContent = c.nombre;
      cap.append(d);
    });
  }

  function ajustarEtiquetas() {
    const b = root.getBoundingClientRect();
    root.querySelectorAll('.px-label').forEach(l => {
      l.classList.remove('flip'); const r = l.getBoundingClientRect();
      if (l.classList.contains('start') && r.right > b.right - 6) { l.classList.replace('start', 'end'); }
      else if (l.classList.contains('end') && r.left < b.left + 6) { l.classList.replace('end', 'start'); }
    });
  }
  function dibujar() {
    const { cols, rows } = grid, px = img.data, piloto = {};
    G.comunas.forEach(c => { if (c.piloto) piloto[c.i] = serie[c.nombre][mes]; });
    const set = (k, rgb) => { const o = k * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, v = M[k];
      if (!v) { set(k, (x % 6 === 0 && y % 6 === 0) ? RGB.trama : RGB.vacio); continue; }
      const vecino = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= cols || yy >= rows ? v : M[yy * cols + xx]; };
      const esBorde = vecino(1, 0) !== v || vecino(-1, 0) !== v || vecino(0, 1) !== v || vecino(0, -1) !== v;
      const s = piloto[v];
      if (!s) { set(k, esBorde ? RGB.borde : RGB.rm); continue; }
      if (esBorde) { set(k, RGB.piloto); continue; }
      const r = hash(k);
      set(k, r < s.falso_positivo ? RGB.fp : r < s.falso_positivo + s.falso_negativo ? RGB.fn : RGB.coincide);
    }
    // el doble: contorno fantasma desplazado de las comunas piloto
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, v = M[k];
      if (!piloto[v]) continue;
      const borde = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return !(xx < 0 || yy < 0 || xx >= cols || yy >= rows) && M[yy * cols + xx] !== v; });
      if (!borde || (x + y) % 2) continue;
      const tx = x + 2, ty = y + 1; if (tx >= cols || ty >= rows) continue;
      const t = ty * cols + tx; if (piloto[M[t]] && hash(t) > .35) continue;
      const o = t * 4; px[o] = Math.round(px[o] * .45 + RGB.doble[0] * .55); px[o + 1] = Math.round(px[o + 1] * .45 + RGB.doble[1] * .55); px[o + 2] = Math.round(px[o + 2] * .45 + RGB.doble[2] * .55);
    }
    ctx.putImageData(img, 0, 0);
    root.querySelectorAll('.px-label').forEach(l => { const s = serie[l.dataset.comuna][mes]; l.querySelector('.v').textContent = `${pct(s.divergencia)} diverge`; });
    $('.px-mes').textContent = 'MES ' + String(mes).padStart(2, '0');
    $('.px-bar i').style.width = (mes / 24 * 100) + '%';
    const tot = G.comunas.filter(c => c.piloto).reduce((a, c) => { const r = resumen[c.nombre], s = serie[c.nombre][mes]; a.h += r.hogares; a.d += r.hogares * s.divergencia; return a; }, { h: 0, d: 0 });
    $('.px-total').textContent = nf.format(Math.round(tot.d));
    cv.setAttribute('aria-label', `Mapa pixelado de la Región Metropolitana con las cuatro comunas del gemelo sintético. Mes ${mes} de 24: ${nf.format(Math.round(tot.d))} de ${nf.format(tot.h)} hogares con divergencia entre registro y vida situada.`);
  }

  function bucle(t) {
    if (jugando && t > pausaHasta && t - ultimo > 260) {
      ultimo = t; mes = mes >= 24 ? 0 : mes + 1; dibujar();
      if (mes === 24) pausaHasta = t + 2600;
    }
    requestAnimationFrame(bucle);
  }

  /* controles */
  const btn = $('.px-play');
  const syncBtn = () => { btn.querySelector('span').textContent = jugando ? 'pause' : 'play_arrow'; btn.setAttribute('aria-label', jugando ? 'Pausar animación' : 'Reproducir animación'); };
  btn.onclick = () => { jugando = !jugando; syncBtn(); };
  $('.px-range').addEventListener('input', e => { jugando = false; syncBtn(); mes = +e.target.value; dibujar(); });
  const syncRange = () => { $('.px-range').value = mes; };
  setInterval(syncRange, 300);

  /* tooltip por celda */
  const tt = document.getElementById('tt');
  cv.addEventListener('pointermove', e => {
    const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * grid.cols), y = Math.floor((e.clientY - b.top) / b.height * grid.rows);
    const v = M[y * grid.cols + x], c = porIndice[v];
    if (!c) { tt.classList.remove('on'); return; }
    let html = `<div class="tt-sub">${c.nombre}</div>`;
    if (c.piloto) { const s = serie[c.nombre][mes], r = resumen[c.nombre];
      html += `<div class="tt-val">${(100 * s.divergencia).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</div><div>hogares con divergencia · mes ${mes}</div><hr class="divider" style="margin:8px 0"><div class="row"><span><span class="key" style="background:${C.fp}"></span>Prioriza sin elegibilidad</span><b>${pct(s.falso_positivo)}</b></div><div class="row"><span><span class="key" style="background:${C.fn}"></span>Elegible no priorizado</span><b>${pct(s.falso_negativo)}</b></div><div class="body-s" style="margin-top:6px">${nf.format(r.hogares)} hogares sintéticos</div>`;
    } else html += `<div class="body-s">Región Metropolitana · fuera de la muestra</div>`;
    tt.innerHTML = html; tt.classList.add('on');
    const rr = tt.getBoundingClientRect(); let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + rr.width > innerWidth - 8) tx = e.clientX - rr.width - 14; if (ty + rr.height > innerHeight - 8) ty = e.clientY - rr.height - 14;
    tt.style.left = Math.max(8, tx) + 'px'; tt.style.top = Math.max(8, ty) + 'px';
  });
  cv.addEventListener('pointerleave', () => tt.classList.remove('on'));

  preparar();
  if (reduce) { mes = 24; }
  syncBtn(); dibujar(); syncRange();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(ajustarEtiquetas));
  requestAnimationFrame(bucle);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const prev = modo; preparar(); if (prev !== modo) dibujar(); requestAnimationFrame(ajustarEtiquetas); }, 120); }).observe(root);
})();

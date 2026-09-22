/* Santiago Gemelo Digital · banner pixel art: las cuatro comunas del gemelo, celda a celda, mes a mes */
(async function () {
  const root = document.getElementById('banner');
  if (!root) return;
  const [G, D] = await Promise.all([fetch('assets/banner_grid.json').then(r => r.json()), fetch('data.json').then(r => r.json())]);
  const $ = s => root.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const nf = new Intl.NumberFormat('es-CL');
  const pct = x => Math.round(100 * x) + '%';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ox = 0, oy = 0, escala = 1;

  /* paleta de pantalla (fija en ambos temas; pasos oscuros validados para daltonismo) */
  const C = { vacio: '#000000', trama: '#171a20', rm: '#1b1e24', borde: '#2e3139', piloto: '#e2e2e9', coincide: '#4f5563', fp: '#d95926', fn: '#3987e5', doble: '#ff8a80', muro: '#b9bcc6', ventana: '#1b1e24', techo: '#8e9099' };
  const RGB = Object.fromEntries(Object.entries(C).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));
  const ANCLA = { 'Santiago': 'end', 'La Pintana': 'end', 'Las Condes': 'start', 'Puente Alto': 'start' };

  const serie = {}; D.serie.forEach(s => (serie[s.comuna] ??= [])[s.mes] = s);
  const resumen = Object.fromEntries(D.resumen.map(r => [r.comuna, r]));
  const porIndice = Object.fromEntries(G.comunas.map(c => [c.i, c]));
  /* sprites: R = techo (estado del hogar), W = muro, v = ventana/puerta */
  const SPR = { casa: ['.R.', 'RRR', 'WvW'], edificio: ['RRR', 'vWv', 'WWW', 'vWv', 'WvW'] };
  let sprites = [];
  let modo = null, grid = null, M = null, mes = 0, jugando = !reduce, ultimo = 0, pausaHasta = 0, img = null;

  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

  function preparar() {
    const m = root.clientWidth < 640 ? 'movil' : 'escritorio';
    if (m === modo) return; modo = m; grid = G[m];
    const A = G.alfabeto; M = new Uint8Array(grid.cols * grid.rows);
    for (let k = 0; k < M.length; k++) M[k] = A.indexOf(grid.celdas[k]);
    cv.width = grid.cols; cv.height = grid.rows;
    // casas y edificios: cantidad ∝ hogares; tipo según la proporción censal de departamentos
    sprites = []; const ocup = new Uint8Array(M.length);
    const cabe = (x0, y0, w, h, v) => { for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { if (x < 1 || y < 1 || x >= grid.cols - 1 || y >= grid.rows - 1) return false; const k = y * grid.cols + x; if (M[k] !== v || ocup[k]) return false; } return true; };
    G.comunas.filter(c => c.piloto).forEach(c => {
      const r = resumen[c.nombre], ctxv = (D.contexto || {})[c.nombre] || {}, deptos = (ctxv.vivienda || {}).departamento ?? .3;
      
      const celdas = []; for (let k = 0; k < M.length; k++) if (M[k] === c.i) celdas.push(k);
      celdas.sort((a, b) => hash(a * 7 + c.i) - hash(b * 7 + c.i));
      const n = Math.max(3, Math.min(Math.round(r.hogares / 5000), Math.floor(celdas.length / 16)));
      let puestos = 0;
      for (const k of celdas) {
        if (puestos >= n) break;
        const tipoPref = hash(k * 3 + 11) < deptos ? 'edificio' : 'casa';
        for (const tipo of [tipoPref]) {
          const f = SPR[tipo], w = f[0].length, h = f.length, x0 = k % grid.cols, y0 = Math.floor(k / grid.cols);
          if (!cabe(x0, y0, w, h, c.i)) continue;
          for (let y = y0 - 2; y <= y0 + h + 1; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) { const kk = y * grid.cols + x; if (kk >= 0 && kk < ocup.length) ocup[kk] = 1; }
          sprites.push({ tipo, x0, y0, w, h, v: c.i, r: hash(k * 13 + 5) }); puestos++; break;
        }
      }
    });
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
      l.style.setProperty('--dy', '0px');
    });
    // desplaza en vertical las que aún se pisan
    const ls = [...root.querySelectorAll('.px-label')];
    const choca = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
    ls.forEach((l, i) => {
      for (let intento = 0; intento < 8; intento++) {
        const r = l.getBoundingClientRect();
        const golpe = ls.slice(0, i).some(o => choca(r, o.getBoundingClientRect()));
        if (!golpe) break;
        const dy = (intento % 2 ? 1 : -1) * Math.ceil((intento + 1) / 2) * (r.height + 4);
        l.style.setProperty('--dy', dy + 'px');
      }
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
    for (const sp of sprites) {
      const s = piloto[sp.v], estado = sp.r < s.falso_positivo ? RGB.fp : sp.r < s.falso_positivo + s.falso_negativo ? RGB.fn : RGB.techo, f = SPR[sp.tipo];
      for (let y = sp.y0 - 1; y <= sp.y0 + sp.h; y++) for (let x = sp.x0 - 1; x <= sp.x0 + sp.w; x++) set(y * cols + x, RGB.vacio);
      f.forEach((fila, dy) => [...fila].forEach((ch, dx) => { if (ch === '.') return; set((sp.y0 + dy) * cols + sp.x0 + dx, ch === 'R' ? estado : ch === 'W' ? RGB.muro : RGB.ventana); }));
    }
    ctx.putImageData(img, 0, 0);
    root.querySelectorAll('.px-label').forEach(l => { const s = serie[l.dataset.comuna][mes]; l.querySelector('.v').textContent = `${pct(s.divergencia)} diverge`; });
    $('.px-mes').textContent = 'MES ' + String(mes).padStart(2, '0');
    $('.px-bar i').style.width = (mes / 24 * 100) + '%';
    const tot = G.comunas.filter(c => c.piloto).reduce((a, c) => { const r = resumen[c.nombre], s = serie[c.nombre][mes]; a.h += r.hogares; a.d += r.hogares * s.divergencia; return a; }, { h: 0, d: 0 });
    $('.px-total').textContent = nf.format(Math.round(tot.d));
    cv.setAttribute('aria-label', `Mapa pixelado de la Región Metropolitana con las cuatro comunas del gemelo sintético. Mes ${mes} de 24: ${nf.format(Math.round(tot.d))} de ${nf.format(tot.h)} hogares con divergencia entre registro y vida situada.`);
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);
  function bucle(t) {
    if (visible && jugando && t > pausaHasta && t - ultimo > 260) {
      ultimo = t; mes = mes >= 24 ? 0 : mes + 1; dibujar(); window.gemelo?.setMes(mes);
      if (mes === 24) pausaHasta = t + 2600;
    }
    requestAnimationFrame(bucle);
  }

  /* controles */
  const btn = $('.px-play');
  const syncBtn = () => { btn.querySelector('span').textContent = jugando ? 'pause' : 'play_arrow'; btn.setAttribute('aria-label', jugando ? 'Pausar animación' : 'Reproducir animación'); };
  btn.onclick = () => { jugando = !jugando; syncBtn(); };
  $('.px-range').addEventListener('input', e => { jugando = false; syncBtn(); mes = +e.target.value; dibujar(); window.gemelo?.setMes(mes); });
  const syncRange = () => { $('.px-range').value = mes; };
  /* reloj compartido con los gráficos de la serie (app.js): un mes que llega de afuera pausa el
     autoplay del banner para no pelear con lo que el usuario está mirando. */
  window.gemelo?.onMes(m => { if (m === mes) return; jugando = false; syncBtn(); mes = m; dibujar(); syncRange(); });
  setInterval(syncRange, 300);

  /* tooltip por celda */
  // el canvas usa object-fit: contain; la capa de etiquetas se ajusta al rectángulo realmente dibujado
  const capa = root.querySelector('.px-labels');
  const encuadrar = () => {
    const b = cv.getBoundingClientRect(); if (!b.width || !grid) return;
    const esc = Math.min(b.width / grid.cols, b.height / grid.rows), w = grid.cols * esc, h = grid.rows * esc;
    ox = (b.width - w) / 2; oy = (b.height - h) / 2; escala = esc;
    const s2 = root.querySelector('.px-stage').getBoundingClientRect();
    if (capa) { capa.style.left = (b.left - s2.left + ox) + 'px'; capa.style.top = (b.top - s2.top + oy) + 'px'; capa.style.width = w + 'px'; capa.style.height = h + 'px'; capa.style.right = 'auto'; capa.style.bottom = 'auto'; }
  };
  const celdaDe = e => { const b = cv.getBoundingClientRect(); return [Math.floor((e.clientX - b.left - ox) / escala), Math.floor((e.clientY - b.top - oy) / escala)]; };
  const tt = document.getElementById('tt');
  cv.addEventListener('pointermove', e => {
    const [x, y] = celdaDe(e);
    const v = M[y * grid.cols + x], c = porIndice[v];
    if (!c) { tt.classList.remove('on'); return; }
    let html = `<div class="tt-sub">${c.nombre}</div>`;
    if (c.piloto) { const s = serie[c.nombre][mes], r = resumen[c.nombre];
      html += `<div class="tt-val">${(100 * s.divergencia).toLocaleString('es-CL', { maximumFractionDigits: 1 })}%</div><div>diverge · mes ${mes}</div><hr class="divider" style="margin:8px 0"><div class="row"><span><span class="key" style="background:${C.fp}"></span>Priorizado sin serlo</span><b>${pct(s.falso_positivo)}</b></div><div class="row"><span><span class="key" style="background:${C.fn}"></span>Excluido siendo elegible</span><b>${pct(s.falso_negativo)}</b></div><div class="body-s" style="margin-top:6px">${nf.format(r.hogares)} hogares · RSH tramo 40%: ${pct(((D.contexto || {})[c.nombre] || {}).rsh?.['0-40'] ?? NaN)} · ${pct(((D.contexto || {})[c.nombre] || {}).vivienda?.departamento ?? NaN)} deptos.</div>`;
      html += `<div class="body-s" style="margin-top:4px;color:var(--md-primary)">Clic: filtrar el tablero por ${c.nombre}</div>`;
    } else html += `<div class="body-s">Fuera de la muestra</div>`;
    cv.style.cursor = c.piloto ? 'pointer' : 'crosshair';
    tt.innerHTML = html; tt.classList.add('on');
    const rr = tt.getBoundingClientRect(); let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + rr.width > innerWidth - 8) tx = e.clientX - rr.width - 14; if (ty + rr.height > innerHeight - 8) ty = e.clientY - rr.height - 14;
    tt.style.left = Math.max(8, tx) + 'px'; tt.style.top = Math.max(8, ty) + 'px';
  });
  cv.addEventListener('pointerleave', () => tt.classList.remove('on'));
  cv.addEventListener('click', e => {
    const [x, y] = celdaDe(e);
    const c = porIndice[M[y * grid.cols + x]];
    if (c?.piloto && window.gemelo) { tt.classList.remove('on'); window.gemelo.setComuna(c.nombre); }
  });
  // las etiquetas de comuna también filtran
  root.querySelector('.px-labels')?.addEventListener('click', e => { const n = e.target.closest('.px-label')?.dataset.comuna; if (n && window.gemelo) window.gemelo.setComuna(n); });

  root.querySelectorAll('.px-ico').forEach(icv => { const f = SPR[icv.dataset.ico], c2 = icv.getContext('2d'); c2.fillStyle = C.vacio; c2.fillRect(0, 0, icv.width, icv.height);
    f.forEach((fila, dy) => [...fila].forEach((ch, dx) => { if (ch === '.') return; c2.fillStyle = ch === 'R' ? C.techo : ch === 'W' ? C.muro : C.ventana; c2.fillRect(dx + 1, dy + 1, 1, 1); })); });
  preparar(); encuadrar();
  if (reduce) { mes = 24; }
  syncBtn(); dibujar(); syncRange(); window.gemelo?.setMes(mes);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => { encuadrar(); ajustarEtiquetas(); }));
  requestAnimationFrame(bucle);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const prev = modo; preparar(); encuadrar(); if (prev !== modo) dibujar(); requestAnimationFrame(ajustarEtiquetas); }, 120); }).observe(root);
})();

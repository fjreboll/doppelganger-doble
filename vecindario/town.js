/* Vecindario · mecánica de "Generative Agents" (Park et al. 2023, Stanford): un pueblo de
   personajes inspeccionables uno por uno. Sin LLM generando comportamiento — el vagabundeo es
   decorativo (posición al azar dentro de un radio de su casa); cada figura es un integrante real
   de un hogar sintético (03_doble.py), agrupado por tramo de edad. Lo que se abre al hacer clic
   es el registro real del hogar completo — el pipeline no simula ingreso ni divergencia por
   persona, solo por hogar. */
(async function () {
  const D = await (await fetch('hogares.json')).json();
  const $ = s => document.querySelector(s);
  const nf = new Intl.NumberFormat('es-CL');
  const clp = x => x == null ? '—' : nf.format(Math.round(x)) + ' CLP';
  const pct = x => Math.round(100 * x) + '%';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  const TIPOLOGIA = { falso_positivo: 'Priorizado sin serlo', falso_negativo: 'Excluido siendo elegible',
    base_desactualizada: 'Base desactualizada', dato_nulo: 'Dato nulo', clasificacion_erronea: 'Clasificación errónea',
    deriva: 'Deriva de umbral', alucinacion_sintetica: 'Alucinación sintética' };
  const LOCUS = { ingreso_no_registrable: 'Ingreso no registrable', movilidad_residencial: 'Movilidad residencial',
    posicion_relativa_en_ranking: 'Posición relativa en el ranking', rezago_ingreso_formal: 'Rezago del ingreso formal',
    composicion_hogar: 'Composición del hogar' };
  const COMUNA_TINT = { 'Santiago': '--viz-1', 'La Pintana': '--viz-2', 'Las Condes': '--viz-3', 'Puente Alto': '--viz-seq' };
  const SPR = { casa: ['.R.', 'RRR', 'WvW'], departamento: ['RRR', 'vWv', 'WWW', 'vWv', 'WvW'], otra: ['RRR', 'WvW', 'WWW'] };
  const TALLA = { '0_14': { h: 5, w: 3 }, '15_29': { h: 7, w: 3 }, '30_44': { h: 7, w: 3 }, '45_64': { h: 7, w: 3 }, '65': { h: 6, w: 3 } };

  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

  /* ── panel de detalle: el registro real del hogar ── */
  const velo = $('#velo'), panel = $('#panel'), body = $('#panel-body');
  function abrir(h, desde) {
    const nota = desde ? `<p class="sub body-s" style="margin-top:-10px">visto: integrante ${desde} de este hogar</p>` : '';
    let html = `<h3 class="title-l">${h.comuna} · ${h.tenencia.replace('_', ' ')}</h3>
      <p class="sub body-m">${h.id} · <span style="font-family:var(--mono)">${h.estatuto}</span> — hogar sintético, no una persona real</p>${nota}
      <div class="f6">
        <b>Vivienda</b><span>${h.tipo_vivienda} · hacinamiento ${h.hacinamiento}</span>
        <b>Integrantes</b><span>${h.integrantes.map(i => i.etiqueta).join(', ')}</span>
        <b>Composición</b><span>${h.numper_t0} persona${h.numper_t0 === 1 ? '' : 's'} → ${h.numper_t24} al mes 24${h.se_mudo ? ' · se mudó' : ''}</span>
        <b>Ingreso t0</b><span>formal ${clp(h.ingreso_formal_t0)} · informal ${clp(h.ingreso_informal_t0)}</span>
        <b>Ingreso t24</b><span>formal ${clp(h.ingreso_formal_t24)} · informal ${clp(h.ingreso_informal_t24)}</span>
      </div>
      <div class="kv"><span>El registro lo prioriza</span><b>${h.registro.prioriza ? 'Sí' : 'No'}</b></div>
      <div class="kv"><span>Tramo del registro (análogo, no CSE-RSH)</span><b>${h.registro.tramo}</b></div>
      <div class="kv"><span>Confianza estimable</span><b>${pct(h.registro.confianza)}</b></div>
      <div class="kv"><span>Antigüedad del dato</span><b>${h.registro.antiguedad_meses} meses</b></div>`;

    if (h.diverge) {
      const d = h.divergencia;
      html += `<div class="divcard">
        <span class="tag">${TIPOLOGIA[d.tipologia] || d.tipologia}</span>
        <p class="body-m">${LOCUS[d.locus] || d.locus || 'Sin locus registrado'}</p>
        <div class="f6">
          <b>1 · Representó</b><span>${d.representacion.prediccion}, percentil ${d.representacion.percentil_registro} · confianza ${pct(d.representacion.confianza)}</span>
          <b>2 · Decisión</b><span>${d.decision}</span>
          <b>3 · Ocurrió</b><span>percentil situado ${d.ocurrido.percentil_situado} · ${d.ocurrido.reside_en_comuna ? 'reside en la comuna' : 'ya no reside en la comuna'}</span>
          <b>4 · Afectado</b><span>${d.afectado.id} · ${d.afectado.numper} persona${d.afectado.numper === 1 ? '' : 's'}</span>
          <b>5 · Reparación</b><span>${d.reparacion || 'ninguna'}</span>
          <b>6 · Formulación</b><span>${d.formulacion.quien}</span>
        </div>
      </div>`;
    } else {
      html += `<div class="nodiv"><span class="material-symbols-outlined">check_circle</span><span class="body-m">Sin divergencia registrada a los 24 meses.</span></div>`;
    }
    body.innerHTML = html;
    velo.classList.add('on'); panel.classList.add('on'); panel.setAttribute('aria-hidden', 'false');
    $('#cerrar').focus();
  }
  function cerrar() { velo.classList.remove('on'); panel.classList.remove('on'); panel.setAttribute('aria-hidden', 'true'); }
  $('#cerrar').onclick = cerrar; velo.onclick = cerrar;
  addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

  /* ── tooltip flotante compartido con el resto del sitio ── */
  const tt = $('#tt');
  const showTT = (e, html) => { tt.innerHTML = html; tt.classList.add('on'); const r = tt.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tt.style.left = Math.max(8, x) + 'px'; tt.style.top = Math.max(8, y) + 'px'; };
  const hideTT = () => tt.classList.remove('on');

  /* ── stats + leyenda de cabecera ── */
  const nDiv = D.hogares.filter(h => h.diverge).length;
  $('#stats').innerHTML = [
    [`${D.n} hogares`, 'de la muestra'],
    [`${pct(nDiv / D.n)}`, `divergen (${nDiv} de ${D.n})`],
    [new Set(D.hogares.map(h => h.comuna)).size + ' comunas', 'representadas'],
    [D.hogares.reduce((a, h) => a + h.integrantes.length, 0) + ' integrantes', 'caminando']
  ].map(([a, b]) => `<span class="chip assist">${a} · ${b}</span>`).join('');

  (function leyenda() {
    const grises = ['#8e9099', '#c4c6d0'];
    const casas = document.createElement('div'); casas.className = 'grupo';
    casas.innerHTML = '<span>Vivienda</span>';
    const fig1 = document.createElement('div'); fig1.className = 'figuritas'; casas.append(fig1);
    ['casa', 'departamento'].forEach(t => {
      const cv = document.createElement('canvas'); const w = document.createElement('div');
      dibujarCasa(cv, t, '--viz-neutral'); cv.style.width = '28px'; cv.style.height = '28px';
      w.append(cv, Object.assign(document.createElement('span'), { textContent: t }));
      fig1.append(w);
    });
    const gente = document.createElement('div'); gente.className = 'grupo';
    gente.innerHTML = '<span>Integrantes por edad</span>';
    const fig2 = document.createElement('div'); fig2.className = 'figuritas'; gente.append(fig2);
    Object.entries(TALLA).forEach(([tramo, t], i) => {
      const cv = document.createElement('canvas'); cv.width = 8; cv.height = 10; const w = document.createElement('div');
      dibujarPersona(cv.getContext('2d'), 4, 9, tramo, grises[i % 2]);
      cv.style.width = '24px'; cv.style.height = '30px';
      const et = Object.entries({ '0_14': 'niño/a', '15_29': 'joven', '30_44': 'adulto', '45_64': '45-64', '65': 'mayor' }).find(([k]) => k === tramo)[1];
      w.append(cv, Object.assign(document.createElement('span'), { textContent: et }));
      fig2.append(w);
    });
    $('#leyenda').append(casas, gente);
  })();

  /* ── sprites ── */
  function dibujarCasa(cv, tipo, techoVar, cell = 4) {
    const f = SPR[tipo] || SPR.otra, w = f[0].length, h = f.length;
    cv.width = w * cell; cv.height = h * cell;
    const ctx = cv.getContext('2d');
    const techo = css(techoVar) || '#8e9099', muro = '#b9bcc6', ventana = '#1b1e24';
    f.forEach((fila, y) => [...fila].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'R' ? techo : ch === 'W' ? muro : ventana;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }));
  }
  /* persona: pies en (x,y); crece hacia arriba. adulto mayor lleva un bastón (accent de 1px) */
  function dibujarPersona(ctx, x, y, tramo, color, bob = 0) {
    const t = TALLA[tramo] || TALLA['30_44'];
    y += bob;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - t.w / 2), Math.round(y - t.h), t.w, t.h - 2); // torso
    ctx.fillRect(Math.round(x - 1), Math.round(y - t.h - 1), 2, 2); // cabeza
    if (tramo === '65') { ctx.fillStyle = css('--md-primary') || '#aac7ff'; ctx.fillRect(Math.round(x + t.w / 2), Math.round(y - 2), 1, 3); }
  }

  /* ── un pueblo (canvas) por comuna ── */
  const porComuna = {};
  D.hogares.forEach(h => (porComuna[h.comuna] ??= []).push(h));
  const barrios = $('#barrios');
  const CELL = 4, SPACING = 26, MARGIN = 14, ZONE_H = 54, GROUND = 42;

  Object.entries(porComuna).forEach(([comuna, hogares]) => {
    const sec = document.createElement('section'); sec.className = 'barrio';
    const nDivC = hogares.filter(h => h.diverge).length;
    sec.innerHTML = `<h2 class="title-l">${comuna} <span class="n">${hogares.length}</span></h2>
      <p class="body-s muted">${nDivC} de ${hogares.length} con divergencia a los 24 meses · ${hogares.reduce((a, h) => a + h.integrantes.length, 0)} integrantes</p>
      <div class="zona"></div>`;
    const zona = sec.querySelector('.zona');
    const cv = document.createElement('canvas'); zona.append(cv);
    const ctx = cv.getContext('2d');

    const W = MARGIN * 2 + hogares.length * SPACING;
    cv.width = W; cv.height = ZONE_H;
    cv.style.minWidth = Math.round(W * 2.4) + 'px';
    const tinte = COMUNA_TINT[comuna] || '--viz-neutral';

    // casas: ancladas en una fila, centradas en su "cuadra"
    const casas = hogares.map((h, i) => {
      const cx = MARGIN + i * SPACING + SPACING / 2;
      const f = SPR[h.tipo_vivienda] || SPR.otra, w = f[0].length * CELL, hh = f.length * CELL;
      return { h, x: cx, y: GROUND, w, hh, tipo: h.tipo_vivienda };
    });

    // árboles decorativos deterministas (no aleatorio en cada redibujo)
    const arboles = [];
    for (let i = 0; i < hogares.length + 1; i++) {
      if (hash(i * 7 + 3) < .55) arboles.push({ x: MARGIN + i * SPACING + (hash(i * 11) < .5 ? 2 : SPACING - 2), y: GROUND });
    }

    // integrantes: uno por persona, deambulan cerca de su casa
    let seq = 0;
    const agentes = [];
    hogares.forEach((h, i) => {
      const casa = casas[i];
      h.integrantes.forEach(p => {
        seq++;
        const homeX = casa.x + (hash(seq * 13) - .5) * (SPACING - 8);
        const homeY = GROUND - 4 - hash(seq * 17) * 22;
        agentes.push({
          hogar: h, tramo: p.tramo_edad, etiqueta: p.etiqueta, casa,
          homeX, homeY, x: homeX, y: homeY, tx: homeX, ty: homeY,
          estado: 'quieto', proximo: performance.now() + hash(seq * 23) * 3000,
          color: css(tinte) || '#8e9099', fase: hash(seq * 29) * 1000
        });
      });
    });

    function limites(a) {
      const minX = a.casa.x - SPACING / 2 + 3, maxX = a.casa.x + SPACING / 2 - 3;
      const minY = GROUND - 30, maxY = GROUND - 3;
      return { minX, maxX, minY, maxY };
    }

    function dibujar(t) {
      ctx.clearRect(0, 0, W, ZONE_H);
      ctx.fillStyle = css('--md-surface-container') || '#1b1e24';
      ctx.fillRect(0, GROUND, W, ZONE_H - GROUND);
      ctx.fillStyle = css('--viz-neutral') || '#44474e'; ctx.globalAlpha = .35;
      arboles.forEach(ar => ctx.fillRect(ar.x, ar.y - 6, 2, 6));
      ctx.globalAlpha = 1;
      casas.forEach(c => {
        const f = SPR[c.tipo] || SPR.otra, muro = '#b9bcc6', ventana = '#1b1e24', techo = css(tinte) || '#8e9099';
        const x0 = c.x - c.w / 2, y0 = c.y - c.hh;
        f.forEach((fila, y) => [...fila].forEach((ch, x) => {
          if (ch === '.') return;
          ctx.fillStyle = ch === 'R' ? techo : ch === 'W' ? muro : ventana;
          ctx.fillRect(x0 + x * CELL, y0 + y * CELL, CELL, CELL);
        }));
      });
      agentes.forEach(a => {
        const bob = a.estado === 'caminando' && !reduce ? Math.sin((t + a.fase) / 140) * .6 : 0;
        dibujarPersona(ctx, a.x, a.y, a.tramo, a.color, bob);
      });
    }

    let ultimo = 0;
    function tick(t) {
      if (!reduce && t - ultimo > 45) {
        ultimo = t;
        agentes.forEach(a => {
          if (a.estado === 'quieto') {
            if (t > a.proximo) {
              const b = limites(a);
              a.tx = Math.max(b.minX, Math.min(b.maxX, a.homeX + (hash((seq = seq + 1) * 31) - .5) * 16));
              a.ty = Math.max(b.minY, Math.min(b.maxY, a.homeY + (hash(seq * 37) - .5) * 10));
              a.estado = 'caminando';
            }
          } else {
            const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
            if (d < .4) { a.estado = 'quieto'; a.proximo = t + 1200 + hash(seq * 41) * 2600; }
            else { const v = Math.min(d, .35); a.x += dx / d * v; a.y += dy / d * v; }
          }
        });
        dibujar(t);
      }
      requestAnimationFrame(tick);
    }
    dibujar(0);
    if (!reduce) requestAnimationFrame(tick);

    /* ── interacción: hover muestra ficha corta, clic abre el registro completo del hogar ── */
    function bajo(px, py) {
      const r = cv.getBoundingClientRect(), sx = cv.width / r.width, sy = cv.height / r.height;
      const x = (px - r.left) * sx, y = (py - r.top) * sy;
      let mejor = null, mejorD = 5.5;
      agentes.forEach(a => { const dd = Math.hypot(a.x - x, (a.y - 4) - y); if (dd < mejorD) { mejorD = dd; mejor = { tipo: 'persona', a }; } });
      if (mejor) return mejor;
      for (const c of casas) { if (x >= c.x - c.w / 2 && x <= c.x + c.w / 2 && y >= c.y - c.hh && y <= c.y) return { tipo: 'casa', c }; }
      return null;
    }
    cv.addEventListener('pointermove', e => {
      const b = bajo(e.clientX, e.clientY);
      if (!b) { hideTT(); cv.style.cursor = 'default'; return; }
      cv.style.cursor = 'pointer';
      if (b.tipo === 'persona') showTT(e, `<div class="tt-sub">${b.a.etiqueta}</div><div class="body-s">${b.a.hogar.id} · ${b.a.hogar.comuna}</div>`);
      else showTT(e, `<div class="tt-sub">${b.c.h.id}</div><div class="body-s">${b.c.h.tenencia.replace('_', ' ')} · ${b.c.h.tipo_vivienda}</div>`);
    });
    cv.addEventListener('pointerleave', hideTT);
    cv.addEventListener('click', e => {
      const b = bajo(e.clientX, e.clientY);
      if (!b) return;
      hideTT();
      if (b.tipo === 'persona') abrir(b.a.hogar, b.a.etiqueta); else abrir(b.c.h);
    });

    barrios.append(sec);
  });
})();

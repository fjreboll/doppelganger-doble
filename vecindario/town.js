/* Vecindario · mecánica de "Generative Agents" (Park et al. 2023, Stanford): un pueblo de
   personajes inspeccionables uno por uno. Sin LLM generando comportamiento — el vagabundeo es
   decorativo (posición al azar dentro de un radio de su casa); cada figura es un integrante real
   de un hogar sintético (03_doble.py), agrupado por tramo de edad. Lo que se abre al hacer clic
   es el registro real del hogar completo — el pipeline no simula ingreso ni divergencia por
   persona, solo por hogar.

   Estilo: personajes y edificios de proporciones legibles (cabeza/torso/brazos/piernas, techo a
   dos aguas con puerta y ventanas), como Tibia/Habbo Hotel/RPGs de 16 bits — no los bloques
   abstractos de la versión anterior. Colores tomados de los tokens M3 del sitio, no de una
   paleta nueva. */
(async function () {
  const D = await (await fetch('hogares.json')).json();
  const $ = s => document.querySelector(s);
  const nf = new Intl.NumberFormat('es-CL');
  const clp = x => x == null ? '—' : nf.format(Math.round(x)) + ' CLP';
  const pct = x => Math.round(100 * x) + '%';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const TIPOLOGIA = { falso_positivo: 'Priorizado sin serlo', falso_negativo: 'Excluido siendo elegible',
    base_desactualizada: 'Base desactualizada', dato_nulo: 'Dato nulo', clasificacion_erronea: 'Clasificación errónea',
    deriva: 'Deriva de umbral', alucinacion_sintetica: 'Alucinación sintética' };
  const LOCUS = { ingreso_no_registrable: 'Ingreso no registrable', movilidad_residencial: 'Movilidad residencial',
    posicion_relativa_en_ranking: 'Posición relativa en el ranking', rezago_ingreso_formal: 'Rezago del ingreso formal',
    composicion_hogar: 'Composición del hogar' };
  const COMUNA_TINT = { 'Santiago': '--viz-1', 'La Pintana': '--viz-2', 'Las Condes': '--viz-3', 'Puente Alto': '--viz-seq' };
  const ETIQUETA_TRAMO = { '0_14': 'niño/a', '15_29': 'joven', '30_44': 'adulto', '45_64': '45-64', '65': 'mayor' };
  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

  /* ── panel de detalle: el registro real del hogar (sin cambios respecto a la iteración anterior) ── */
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

  /* ══════════════════ sprites: proporciones legibles, no bloques abstractos ══════════════════ */
  const PIEL = '#e3c1a0';           // un solo tono, igual para todos: figuras estilizadas, no un dato del RSH
  const PUERTA = '#20242c';
  const MARCO = '#0f1116';

  /* persona: pies en (x,y), crece hacia arriba. niño/a en proporción "chibi" (cabeza más grande). */
  const PROP_ADULTO = { legW: 3, legH: 8, torW: 11, torH: 8, armW: 3, armH: 7, headW: 9, headH: 8, hairH: 4 };
  const PROP_NINO = { legW: 3, legH: 5, torW: 9, torH: 6, armW: 3, armH: 5, headW: 8, headH: 7, hairH: 3 };
  function propDe(tramo) { return tramo === '0_14' ? PROP_NINO : PROP_ADULTO; }
  function altoPersona(tramo) { const p = propDe(tramo); return p.legH + p.torH + p.headH + p.hairH; }

  function dibujarPersona(ctx, x, y, tramo, color, fase = 0, quieto = true) {
    const p = propDe(tramo), r = v => Math.round(v);
    const paso = quieto ? 0 : Math.sin(fase / 130) * 2.1;           // alternancia simple de piernas
    const pelo = tramo === '65' ? '#c9ccd6' : '#3a3f4a';
    let yy = y;
    // piernas (una adelantada, otra atrasada — así se lee como caminar)
    ctx.fillStyle = MARCO;
    ctx.fillRect(r(x - p.legW - 1), r(yy - p.legH + Math.max(0, -paso)), p.legW, p.legH - Math.max(0, -paso));
    ctx.fillRect(r(x + 1), r(yy - p.legH + Math.max(0, paso)), p.legW, p.legH - Math.max(0, paso));
    yy -= p.legH;
    // torso
    ctx.fillStyle = color;
    ctx.fillRect(r(x - p.torW / 2), r(yy - p.torH), p.torW, p.torH);
    // brazos (piel)
    ctx.fillStyle = PIEL;
    ctx.fillRect(r(x - p.torW / 2 - p.armW), r(yy - p.torH + 1), p.armW, p.armH);
    ctx.fillRect(r(x + p.torW / 2), r(yy - p.torH + 1), p.armW, p.armH);
    yy -= p.torH;
    // cabeza
    ctx.fillStyle = PIEL;
    ctx.fillRect(r(x - p.headW / 2), r(yy - p.headH), p.headW, p.headH);
    // ojos (dos píxeles oscuros, dan frente/lectura de "cara")
    ctx.fillStyle = MARCO;
    ctx.fillRect(r(x - p.headW / 2 + 1.5), r(yy - p.headH / 2 - 1), 1.5, 1.5);
    ctx.fillRect(r(x + p.headW / 2 - 3), r(yy - p.headH / 2 - 1), 1.5, 1.5);
    yy -= p.headH;
    // pelo
    ctx.fillStyle = pelo;
    ctx.fillRect(r(x - p.headW / 2 - .5), r(yy - p.hairH), p.headW + 1, p.hairH);
    if (tramo === '65') { // bastón: distingue al adulto mayor sin depender del color
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(r(x + p.torW / 2 + p.armW + 1), r(y - p.legH - 2), 1.5, p.legH + 4);
    }
  }

  const casita = t => ({
    casa: { wallW: 26, wallH: 22, roofH: 15, roofOver: 4 },
    departamento: { wallW: 30, wallH: 46, roofH: 6, roofOver: 3 },
    otra: { wallW: 24, wallH: 18, roofH: 10, roofOver: 3 }
  }[t] || { wallW: 24, wallH: 18, roofH: 10, roofOver: 3 });
  function anchoCasa(tipo) { const c = casita(tipo); return c.wallW + c.roofOver * 2; }
  function altoCasa(tipo) { const c = casita(tipo); return c.wallH + c.roofH; }

  /* casa: base en (x,y). departamento: mismo esqueleto, techo plano y más ventanas (edificio). */
  function dibujarCasa(ctx, x, y, tipo, techoVar) {
    const c = casita(tipo), techo = css(techoVar) || '#8e9099', muro = '#cdd0da', r = v => Math.round(v);
    const wx0 = x - c.wallW / 2, wy0 = y - c.wallH;
    // cimiento
    ctx.fillStyle = MARCO; ctx.fillRect(r(wx0 - 1), r(y - 2), c.wallW + 2, 2);
    // muro
    ctx.fillStyle = muro; ctx.fillRect(r(wx0), r(wy0), c.wallW, c.wallH);
    // sombra lateral (da volumen sin agregar un color nuevo)
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(r(wx0 + c.wallW - 4), r(wy0), 4, c.wallH);

    if (tipo === 'departamento') {
      // techo plano
      ctx.fillStyle = techo; ctx.fillRect(r(x - c.wallW / 2 - c.roofOver), r(wy0 - c.roofH), c.wallW + c.roofOver * 2, c.roofH);
      // ventanas: grilla — tantas filas como el alto permite, dos columnas
      const filas = Math.max(2, Math.floor((c.wallH - 10) / 9));
      for (let f = 0; f < filas; f++) {
        const wy = wy0 + 6 + f * 9;
        [wx0 + 4, wx0 + c.wallW - 4 - 5].forEach(wx => {
          ctx.fillStyle = MARCO; ctx.fillRect(r(wx), r(wy), 5, 5);
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(r(wx), r(wy), 5, 1);
        });
      }
      // puerta
      ctx.fillStyle = PUERTA; ctx.fillRect(r(x - 4), r(y - 10), 8, 10);
    } else {
      // techo a dos aguas
      ctx.fillStyle = techo;
      ctx.beginPath();
      ctx.moveTo(x, wy0 - c.roofH);
      ctx.lineTo(wx0 - c.roofOver, wy0 + 2);
      ctx.lineTo(wx0 + c.wallW + c.roofOver, wy0 + 2);
      ctx.closePath(); ctx.fill();
      // chimenea
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(r(x + c.wallW * .18), r(wy0 - c.roofH * .55), 4, c.roofH * .55 + 2);
      // puerta
      ctx.fillStyle = PUERTA; ctx.fillRect(r(x - 3.5), r(y - 11), 7, 11);
      ctx.fillStyle = '#c9ccd6'; ctx.fillRect(r(x + 2), r(y - 6), 1, 1.4); // picaporte
      // ventanas
      [wx0 + 4, wx0 + c.wallW - 9].forEach(wx => {
        const wy = wy0 + c.wallH * .32;
        ctx.fillStyle = MARCO; ctx.fillRect(r(wx), r(wy), 5, 5);
        ctx.fillStyle = muro; ctx.fillRect(r(wx + 2.2), r(wy), .8, 5); ctx.fillRect(r(wx), r(wy + 2.2), 5, .8);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(r(wx), r(wy), 5, 1);
      });
    }
  }

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
    const casasWrap = document.createElement('div'); casasWrap.className = 'grupo';
    casasWrap.innerHTML = '<span>Vivienda</span>';
    const fig1 = document.createElement('div'); fig1.className = 'figuritas'; casasWrap.append(fig1);
    ['casa', 'departamento'].forEach(t => {
      const cv = document.createElement('canvas'), w = document.createElement('div');
      const W = anchoCasa(t) + 6, H = altoCasa(t) + 4;
      cv.width = W; cv.height = H;
      dibujarCasa(cv.getContext('2d'), W / 2, H - 2, t, '--viz-neutral');
      cv.style.width = (W * 1.6) + 'px'; cv.style.height = (H * 1.6) + 'px';
      w.append(cv, Object.assign(document.createElement('span'), { textContent: t }));
      fig1.append(w);
    });
    const gente = document.createElement('div'); gente.className = 'grupo';
    gente.innerHTML = '<span>Integrantes por edad</span>';
    const fig2 = document.createElement('div'); fig2.className = 'figuritas'; gente.append(fig2);
    Object.keys(ETIQUETA_TRAMO).forEach((tramo, i) => {
      const H = altoPersona(tramo) + 6, W = 26;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const w = document.createElement('div');
      dibujarPersona(cv.getContext('2d'), W / 2, H - 2, tramo, grises[i % 2]);
      cv.style.width = (W * 1.6) + 'px'; cv.style.height = (H * 1.6) + 'px';
      w.append(cv, Object.assign(document.createElement('span'), { textContent: ETIQUETA_TRAMO[tramo] }));
      fig2.append(w);
    });
    $('#leyenda').append(casasWrap, gente);
  })();

  /* ══════════════════ un pueblo (canvas) por comuna ══════════════════ */
  const porComuna = {};
  D.hogares.forEach(h => (porComuna[h.comuna] ??= []).push(h));
  const barrios = $('#barrios');
  const SPACING = 92, MARGIN = 46, GROUND = 76, ZONE_H = 96;

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
    cv.style.minWidth = Math.round(W * 1.35) + 'px';
    const tinte = COMUNA_TINT[comuna] || '--viz-neutral';

    const casas = hogares.map((h, i) => {
      const cx = MARGIN + i * SPACING + SPACING / 2;
      return { h, x: cx, y: GROUND, w: anchoCasa(h.tipo_vivienda), hh: altoCasa(h.tipo_vivienda), tipo: h.tipo_vivienda };
    });

    // árboles decorativos deterministas — tono neutro para no competir con el color de comuna
    const arboles = [];
    for (let i = 0; i <= hogares.length; i++) {
      if (hash(i * 7 + 3) < .5) arboles.push({ x: MARGIN + i * SPACING + (hash(i * 11) < .5 ? -SPACING / 2 + 10 : SPACING / 2 - 10) });
    }

    // integrantes: caminan a nivel de suelo, en la vereda frente a su casa
    let seq = 0;
    const agentes = [];
    hogares.forEach((h, i) => {
      const casa = casas[i];
      h.integrantes.forEach(p => {
        seq++;
        const homeX = casa.x + (hash(seq * 13) - .5) * (SPACING - 26);
        const homeY = GROUND - hash(seq * 17) * 4;
        agentes.push({
          hogar: h, tramo: p.tramo_edad, etiqueta: p.etiqueta, casa,
          homeX, homeY, x: homeX, y: homeY, tx: homeX, ty: homeY,
          estado: 'quieto', proximo: performance.now() + hash(seq * 23) * 3000,
          color: css(tinte) || '#8e9099', fase: hash(seq * 29) * 1000
        });
      });
    });

    function limites(a) {
      return { minX: a.casa.x - SPACING / 2 + 10, maxX: a.casa.x + SPACING / 2 - 10, minY: GROUND - 6, maxY: GROUND };
    }

    function dibujar(t) {
      ctx.clearRect(0, 0, W, ZONE_H);
      ctx.fillStyle = css('--md-surface-container') || '#1b1e24';
      ctx.fillRect(0, GROUND + 1, W, ZONE_H - GROUND - 1);
      ctx.fillStyle = css('--md-outline-variant') || '#33333a';
      ctx.fillRect(0, GROUND, W, 1);
      ctx.globalAlpha = .5;
      arboles.forEach(ar => {
        ctx.fillStyle = '#6b4a2f'; ctx.fillRect(ar.x - 1, GROUND - 9, 2, 9);
        ctx.fillStyle = css('--viz-neutral') || '#44474e';
        ctx.beginPath(); ctx.arc(ar.x, GROUND - 12, 6, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      casas.forEach(c => dibujarCasa(ctx, c.x, c.y, c.tipo, tinte));
      agentes.forEach(a => dibujarPersona(ctx, a.x, a.y, a.tramo, a.color, t + a.fase, a.estado === 'quieto'));
    }

    let ultimo = 0;
    function tick(t) {
      if (!reduce && t - ultimo > 40) {
        ultimo = t;
        agentes.forEach(a => {
          if (a.estado === 'quieto') {
            if (t > a.proximo) {
              const b = limites(a);
              a.tx = Math.max(b.minX, Math.min(b.maxX, a.homeX + (hash((seq = seq + 1) * 31) - .5) * 30));
              a.ty = Math.max(b.minY, Math.min(b.maxY, a.homeY + (hash(seq * 37) - .5) * 4));
              a.estado = 'caminando';
            }
          } else {
            const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
            if (d < .5) { a.estado = 'quieto'; a.proximo = t + 1200 + hash(seq * 41) * 2600; }
            else { const v = Math.min(d, .4); a.x += dx / d * v; a.y += dy / d * v; }
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
      let mejor = null, mejorD = 13;
      agentes.forEach(a => { const centroY = a.y - altoPersona(a.tramo) / 2; const dd = Math.hypot(a.x - x, centroY - y); if (dd < mejorD) { mejorD = dd; mejor = { tipo: 'persona', a }; } });
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

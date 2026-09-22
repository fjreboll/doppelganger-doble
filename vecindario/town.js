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
  const lerp = (a, b, t) => a + (b - a) * t;
  /* punto sobre una cara sheared (paralelogramo) en coordenadas paramétricas u,v ∈ [0,1] —
     así una ventana "se apoya" en la pared isométrica en vez de quedar pegada sin perspectiva */
  function puntoCara(c, u, v) {
    const top = { x: lerp(c[0].x, c[1].x, u), y: lerp(c[0].y, c[1].y, u) };
    const bot = { x: lerp(c[3].x, c[2].x, u), y: lerp(c[3].y, c[2].y, u) };
    return { x: lerp(top.x, bot.x, v), y: lerp(top.y, bot.y, v) };
  }
  function poligono(ctx, pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.fill(); }
  function ventanaEnCara(ctx, c, u, v, su, sv) {
    poligono(ctx, [puntoCara(c, u, v), puntoCara(c, u + su, v), puntoCara(c, u + su, v + sv), puntoCara(c, u, v + sv)], MARCO);
    const p0 = puntoCara(c, u, v), p1 = puntoCara(c, u + su, v);
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }

  /* persona: pies en (x,y), crece hacia arriba. niño/a en proporción "chibi" (cabeza más grande,
     cuerpo más corto). Cuello, manos y zapatos aparte de piel/ropa para que no se lean como bloques. */
  const PROP_ADULTO = { legW: 4, legH: 10, torW: 14, torH: 10, armW: 4, armH: 9, headW: 11, headH: 10, hairH: 5, neckH: 2 };
  const PROP_NINO = { legW: 3, legH: 6, torW: 10, torH: 7, armW: 3, armH: 6, headW: 9, headH: 9, hairH: 4, neckH: 2 };
  function propDe(tramo) { return tramo === '0_14' ? PROP_NINO : PROP_ADULTO; }
  function altoPersona(tramo) { const p = propDe(tramo); return p.legH + p.torH + p.neckH + p.headH + p.hairH; }

  function dibujarPersona(ctx, x, y, tramo, color, fase = 0, quieto = true) {
    const p = propDe(tramo), r = v => Math.round(v);
    const paso = quieto ? 0 : Math.sin(fase / 130) * 2.4;           // alternancia simple de piernas
    const pelo = tramo === '65' ? '#c9ccd6' : '#3a3f4a';
    const sombra = 'rgba(0,0,0,.16)';
    let yy = y;
    // sombra de contacto (ancla la figura al suelo)
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 1, p.torW / 2.2, 1.6, 0, 0, 7); ctx.fill();
    // zapatos + piernas (una adelantada, otra atrasada — así se lee como caminar)
    const oi = Math.max(0, -paso), od = Math.max(0, paso);
    ctx.fillStyle = '#2b2320';
    ctx.fillRect(r(x - p.legW - 1), r(yy - 2 + oi), p.legW, 2);
    ctx.fillRect(r(x + 1), r(yy - 2 + od), p.legW, 2);
    ctx.fillStyle = '#33363f';
    ctx.fillRect(r(x - p.legW - 1), r(yy - p.legH + oi), p.legW, p.legH - 2 - oi);
    ctx.fillRect(r(x + 1), r(yy - p.legH + od), p.legW, p.legH - 2 - od);
    yy -= p.legH;
    // torso (con una franja más oscura al costado, igual que en las casas: volumen sin color nuevo)
    ctx.fillStyle = color; ctx.fillRect(r(x - p.torW / 2), r(yy - p.torH), p.torW, p.torH);
    ctx.fillStyle = sombra; ctx.fillRect(r(x + p.torW / 2 - 3), r(yy - p.torH), 3, p.torH);
    // brazos + manos
    ctx.fillStyle = color;
    ctx.fillRect(r(x - p.torW / 2 - p.armW), r(yy - p.torH + 1), p.armW, p.armH - 2);
    ctx.fillRect(r(x + p.torW / 2), r(yy - p.torH + 1), p.armW, p.armH - 2);
    ctx.fillStyle = PIEL;
    ctx.fillRect(r(x - p.torW / 2 - p.armW), r(yy - p.torH + p.armH - 1), p.armW, 2);
    ctx.fillRect(r(x + p.torW / 2), r(yy - p.torH + p.armH - 1), p.armW, 2);
    yy -= p.torH;
    // cuello
    ctx.fillStyle = PIEL; ctx.fillRect(r(x - 1.5), r(yy - p.neckH), 3, p.neckH);
    yy -= p.neckH;
    // cabeza
    ctx.fillStyle = PIEL; ctx.fillRect(r(x - p.headW / 2), r(yy - p.headH), p.headW, p.headH);
    ctx.fillStyle = sombra; ctx.fillRect(r(x + p.headW / 2 - 2.5), r(yy - p.headH), 2.5, p.headH); // sombra de mejilla
    // cejas + ojos + boca
    ctx.fillStyle = pelo === '#c9ccd6' ? '#9a9da6' : '#20242c';
    ctx.fillRect(r(x - p.headW / 2 + 1.5), r(yy - p.headH / 2 - 2.6), 2, .8);
    ctx.fillRect(r(x + p.headW / 2 - 3.5), r(yy - p.headH / 2 - 2.6), 2, .8);
    ctx.fillStyle = MARCO;
    ctx.fillRect(r(x - p.headW / 2 + 1.7), r(yy - p.headH / 2 - 1), 1.6, 1.6);
    ctx.fillRect(r(x + p.headW / 2 - 3.3), r(yy - p.headH / 2 - 1), 1.6, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(r(x - 1.5), r(yy - p.headH / 2 + 2.4), 3, .8);
    yy -= p.headH;
    // pelo, con un mechón lateral para que no se lea como un casco plano
    ctx.fillStyle = pelo;
    ctx.fillRect(r(x - p.headW / 2 - .5), r(yy - p.hairH), p.headW + 1, p.hairH);
    ctx.fillRect(r(x - p.headW / 2 - .5), r(yy), 2.4, 3.2);
    ctx.fillRect(r(x + p.headW / 2 - 1.9), r(yy), 2.4, 3.2);
    if (tramo === '65') { // bastón: distingue al adulto mayor sin depender del color
      ctx.fillStyle = '#8a6a45';
      ctx.fillRect(r(x + p.torW / 2 + p.armW + 1), r(y - p.legH - 2), 1.6, p.legH + 4);
      ctx.fillStyle = '#5c4530'; ctx.fillRect(r(x + p.torW / 2 + p.armW), r(y - p.legH - 3), 3, 1.6);
    }
  }

  /* ══════════════════ edificios en plano isométrico (2 caras + techo), estilo Habbo/Tibia ══════════════════ */
  const DIM = {
    casa: { hw: 15, alto: 17, techo: 11 },
    departamento: { hw: 17, alto: 34, techo: 0 },
    otra: { hw: 14, alto: 15, techo: 8 }
  };
  function dimDe(tipo) { return DIM[tipo] || DIM.otra; }
  function anchoCasa(tipo) { return dimDe(tipo).hw * 2; }
  function altoCasa(tipo) { const d = dimDe(tipo); return d.alto + d.hw + d.techo; } // pared + medio rombo + techo

  /* caja isométrica: (cx, groundY) es el punto donde la esquina frontal toca el piso. hw = medio ancho
     del rombo superior (proporción clásica 2:1: medio-alto = hw/2). Devuelve las 3 caras visibles. */
  function cajaIso(cx, groundY, hw, alto) {
    const hv = hw / 2, cyCentro = groundY - alto - hv;
    const top = { x: cx, y: cyCentro - hv }, bot = { x: cx, y: cyCentro + hv };
    const left = { x: cx - hw, y: cyCentro }, right = { x: cx + hw, y: cyCentro };
    const botE = { x: bot.x, y: bot.y + alto }, leftE = { x: left.x, y: left.y + alto }, rightE = { x: right.x, y: right.y + alto };
    return {
      diamante: [top, right, bot, left],
      caraIzq: [left, bot, botE, leftE],   // orden u,v: (0,0)(1,0)(1,1)(0,1) — para puntoCara
      caraDer: [bot, right, rightE, botE],
      top, bot, left, right, botE, leftE, rightE
    };
  }

  function dibujarCasa(ctx, x, y, tipo, techoVar) {
    const d = dimDe(tipo), techo = css(techoVar) || '#8e9099';
    const muroClaro = '#d7dae2', muroOscuro = '#a7abb6';
    const caja = cajaIso(x, y, d.hw, d.alto);
    // sombra de contacto en el suelo
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 1, d.hw + 3, 3, 0, 0, 7); ctx.fill();
    // dos caras de pared: izquierda más oscura (da volumen), derecha más clara
    poligono(ctx, caja.caraIzq, muroOscuro);
    poligono(ctx, caja.caraDer, muroClaro);
    // puerta: sobre la cara derecha, apoyada en el borde inferior
    ventanaEnCara(ctx, caja.caraDer, .38, .58, .26, .42);
    ctx.fillStyle = PUERTA; // repinta la puerta encima (ventanaEnCara usa MARCO; la puerta es más oscura aún)
    poligono(ctx, [puntoCara(caja.caraDer, .38, .58), puntoCara(caja.caraDer, .64, .58), puntoCara(caja.caraDer, .64, 1), puntoCara(caja.caraDer, .38, 1)], PUERTA);
    // ventanas: una por cara
    ventanaEnCara(ctx, caja.caraIzq, .28, .2, .32, .3);
    ventanaEnCara(ctx, caja.caraDer, .38, .1, .3, .28);

    if (tipo === 'departamento') {
      // techo plano: el rombo superior, tintado por comuna; una fila extra de ventanas por piso
      poligono(ctx, caja.diamante, techo);
      const pisos = Math.max(2, Math.round(d.alto / 11));
      for (let f = 1; f < pisos; f++) {
        const v = f / pisos;
        ventanaEnCara(ctx, caja.caraIzq, .22, v - .08, .26, .16);
        ventanaEnCara(ctx, caja.caraDer, .5, v - .08, .24, .16);
      }
    } else {
      // techo a cuatro aguas: dos triángulos desde un vértice sobre el rombo hasta sus bordes
      const pico = { x: x, y: caja.top.y - d.techo };
      poligono(ctx, [pico, caja.left, caja.bot], 'color-mix(in srgb,' + techo + ' 72%, black)');
      poligono(ctx, [pico, caja.right, caja.bot], techo);
      // caballete + una pincelada de luz en el faldón derecho
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pico.x, pico.y); ctx.lineTo(caja.bot.x, caja.bot.y); ctx.stroke();
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

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
  const COMUNA_TINT = { 'Santiago': '--viz-1', 'La Pintana': '--viz-2', 'Las Condes': '--viz-3', 'Puente Alto': '--viz-4' };
  const ROPA = ['#c96a4b', '#4a7bab', '#c9a33f', '#8a5a8f', '#5c8f5c', '#b5673f'];   // variedad decorativa, no codifica nada
  const PUERTAS = ['#5c4530', '#3d5a4d', '#4a3d5c', '#6b4530'];
  const ETIQUETA_TRAMO = { '0_14': 'niño/a', '15_29': 'joven', '30_44': 'adulto joven', '45_64': 'adulto', '65': 'adulto mayor' };
  // orden explícito: '65' es una clave numérica y JS la reordena sola al inicio del objeto
  // (antes que '0_14', '15_29'…), por eso la leyenda salía con 45-64 fuera de secuencia
  const ORDEN_TRAMO = ['0_14', '15_29', '30_44', '45_64', '65'];
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
    // accesorio por tramo: mochila (niño/a, joven) o bolso (adulto/adulto joven) al lado izquierdo,
    // bastón (mayor) al derecho — refuerzo gráfico decorativo, no codifica ningún dato del registro
    if (tramo === '0_14' || tramo === '15_29') {
      const bw = tramo === '0_14' ? 4 : 5, bh = tramo === '0_14' ? 4.5 : 6;
      const bx = x - p.torW / 2 - p.armW - bw - .5, by = yy - p.torH + 1;
      ctx.fillStyle = 'color-mix(in srgb,' + color + ' 55%, black)'; ctx.fillRect(r(bx), r(by), bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(r(bx), r(by), bw, 1);
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, r(yy - p.torH - .5)); ctx.stroke();
    } else if (tramo === '30_44' || tramo === '45_64') {
      const bx = x - p.torW / 2 - p.armW - 3.5, by = yy - p.torH + p.armH - 3;
      ctx.fillStyle = 'color-mix(in srgb,' + color + ' 55%, black)'; ctx.fillRect(r(bx), r(by), 3.5, 4.5);
      ctx.strokeStyle = 'color-mix(in srgb,' + color + ' 40%, black)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(bx + .5, by); ctx.lineTo(bx + 1.5, r(yy - p.torH)); ctx.stroke();
    }
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

  /* ══════════════════ edificios en plano cenital (vista aérea), con detalle de techo y entrada ══════════════════
     El isométrico (dos caras de pared) no se leía bien a este tamaño de parcela — vuelve a un plano
     desde arriba, como en Zelda/Stardew Valley/SimCity clásico: el techo es lo que domina la lectura,
     con textura propia, y una franja de fachada al pie (puerta + ventanas) para que no sea un
     rectángulo plano. (x, y) es el punto medio del borde frontal de esa franja. */
  const DIM = {
    casa: { w: 32, d: 34, entrada: 11 },
    departamento: { w: 46, d: 46, entrada: 14 },
    otra: { w: 28, d: 28, entrada: 9 }
  };
  function dimDe(tipo) { return DIM[tipo] || DIM.otra; }
  function anchoCasa(tipo) { return dimDe(tipo).w + 6; }   // +6: margen del jardín/plaza
  function altoCasa(tipo) { return dimDe(tipo).d + 4; }

  function dibujarCasa(ctx, x, y, tipo, techoVar, puertaColor) {
    const d = dimDe(tipo), techo = css(techoVar) || '#8e9099', puerta = puertaColor || PUERTA, r = v => Math.round(v);
    const muro = '#cfd2dc', x0 = x - d.w / 2, techoY0 = y - d.d, entradaY0 = y - d.entrada;
    const oscuro = c => 'color-mix(in srgb,' + c + ' 78%, black)', claro = c => 'color-mix(in srgb,' + c + ' 85%, white)';

    // sombra proyectada (da profundidad sin isométrico: el sol pega de arriba-izquierda)
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(x0 + 3, techoY0 + 3, d.w, y - techoY0);

    // techo: dos aguas visto desde arriba (cumbrera + dos faldones de sombra distinta) en casa;
    // losa con instalaciones en departamento
    ctx.fillStyle = techo; ctx.fillRect(r(x0), r(techoY0), d.w, d.d - d.entrada);
    if (tipo === 'departamento') {
      // losa técnica: costuras de membrana + un par de equipos de aire y una caseta de acceso
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = .7;
      for (let fy = techoY0 + 6; fy < entradaY0 - 3; fy += 7) { ctx.beginPath(); ctx.moveTo(x0 + 2, fy); ctx.lineTo(x0 + d.w - 2, fy); ctx.stroke(); }
      ctx.fillStyle = oscuro(techo); ctx.fillRect(r(x0 + d.w * .18), r(techoY0 + d.d * .18), 7, 5); ctx.fillRect(r(x0 + d.w * .62), r(techoY0 + d.d * .5), 6, 6);
      ctx.fillStyle = '#787d87'; ctx.fillRect(r(x0 + d.w * .6), r(techoY0 + d.d * .18), 8, 6);
      ctx.fillStyle = claro(techo); ctx.fillRect(r(x0 + d.w * .61), r(techoY0 + d.d * .19), 8, 1.4);
    } else {
      // cumbrera + dos faldones (izq. sombra, der. luz) — el gesto de un techo a dos aguas visto de arriba
      const midX = x;
      ctx.fillStyle = oscuro(techo); ctx.fillRect(r(x0), r(techoY0), d.w / 2, d.d - d.entrada);
      ctx.fillStyle = claro(techo); ctx.fillRect(r(midX), r(techoY0), d.w / 2, d.d - d.entrada);
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(midX, techoY0); ctx.lineTo(midX, entradaY0); ctx.stroke();
      // tejas: líneas perpendiculares a la cumbrera
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = .6;
      for (let fy = techoY0 + 5; fy < entradaY0; fy += 5) { ctx.beginPath(); ctx.moveTo(x0 + 1, fy); ctx.lineTo(x0 + d.w - 1, fy); ctx.stroke(); }
      // chimenea
      ctx.fillStyle = '#6b5a4a'; ctx.fillRect(r(x0 + d.w * .72), r(techoY0 + d.d * .22), 5, 5);
      ctx.fillStyle = '#2a231c'; ctx.fillRect(r(x0 + d.w * .72) + 1, r(techoY0 + d.d * .22) + 1, 3, 3);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r(x0) + .5, r(techoY0) + .5, d.w - 1, d.d - d.entrada - 1);

    // banderín de comuna en la cumbrera: mismo color que el techo, para que la identidad de
    // comuna se lea también como forma (asta + paño), no solo como tinte de un área grande
    const astaX = r(x0 + d.w - 4), astaTop = techoY0 - 8;
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(astaX, techoY0 + 1); ctx.lineTo(astaX, astaTop); ctx.stroke();
    ctx.fillStyle = techo;
    ctx.beginPath(); ctx.moveTo(astaX, astaTop); ctx.lineTo(astaX + 7, astaTop + 2.6); ctx.lineTo(astaX, astaTop + 5.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .5; ctx.stroke();

    // franja de fachada: puerta + ventanas + alero
    ctx.fillStyle = muro; ctx.fillRect(r(x0), r(entradaY0), d.w, d.entrada);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r(x0), r(entradaY0), d.w, 1.4); // sombra del alero
    const puertaW = tipo === 'departamento' ? 9 : 6;
    ctx.fillStyle = puerta; ctx.fillRect(r(x - puertaW / 2), r(entradaY0 + 2), puertaW, d.entrada - 2);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(r(x + puertaW / 2 - 2), r(entradaY0 + d.entrada / 2), 1, 1.3);
    const ventanas = tipo === 'departamento' ? [x0 + 7, x0 + d.w - 7 - 5, x0 + d.w / 2 - 2.5] : [x0 + 5, x0 + d.w - 5 - 4.5];
    ventanas.forEach(wx => {
      if (Math.abs(wx + 4 - x) < puertaW) return; // no pisar la puerta
      ctx.fillStyle = MARCO; ctx.fillRect(r(wx), r(entradaY0 + 3), 4.5, d.entrada - 5);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(r(wx), r(entradaY0 + 3), 4.5, 1);
    });

    if (tipo === 'departamento') {
      // plaza pavimentada + jardinera + banca — más sofisticado que pasto liso
      ctx.fillStyle = '#8a8574'; ctx.fillRect(r(x - d.w * .32), r(y), d.w * .64, 4);
      ctx.fillStyle = '#3d5c3d'; ctx.fillRect(r(x - d.w * .4), r(y + 1), 5, 2.6);
      ctx.fillStyle = '#4f7a4f'; ctx.fillRect(r(x - d.w * .4) + 1, r(y), 3, 1.6);
      const bxr = r(x + d.w * .18);
      ctx.fillStyle = '#6b5a45'; ctx.fillRect(bxr, r(y + 1), 8, 1.4);
      ctx.fillStyle = '#4a3d30'; ctx.fillRect(bxr, r(y + 2.4), 1, 1.6); ctx.fillRect(bxr + 7, r(y + 2.4), 1, 1.6);
    } else {
      // seto recortado a ambos lados de la puerta + tendedero con ropa — vida cotidiana en el patio
      [x0 + 3, x0 + d.w - 6].forEach(hx => {
        ctx.fillStyle = '#3d5c3d'; ctx.beginPath(); ctx.ellipse(hx + 1.5, y + 1, 3.2, 2.4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#4f7a4f'; ctx.beginPath(); ctx.ellipse(hx + .8, y, 1.8, 1.2, 0, 0, 7); ctx.fill();
      });
      const ropaVar = ROPA[Math.abs(Math.round(x * 3 + y)) % ROPA.length];
      const polo1 = x0 - 2, polo2 = x0 - 2 + 11, poloY = y - 5;
      ctx.strokeStyle = '#5c5346'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(polo1, y + 1); ctx.lineTo(polo1, poloY); ctx.lineTo(polo2, poloY); ctx.lineTo(polo2, y + 1); ctx.stroke();
      ctx.fillStyle = ropaVar; ctx.fillRect(r(polo1 + 1.5), r(poloY), 3, 3.4);
      ctx.fillStyle = '#dfe3ee'; ctx.fillRect(r(polo1 + 5.5), r(poloY), 2.6, 4.2);
    }
  }

  /* pasto + sendero de piedra hasta la puerta — el color de comuna entra también por el suelo
     (no solo por el techo/banderín), para que la parcela se lea como parte de su barrio incluso
     vista sola, fuera de la sección agrupada por comuna. */
  function dibujarSuelo(ctx, W, H, groundY, puertaX, tinteVar) {
    const tinte = css(tinteVar) || '#5c6370';
    ctx.fillStyle = '#182018'; ctx.fillRect(0, 0, W, H);
    const pasto = ctx.createLinearGradient(0, groundY - 6, 0, H);
    pasto.addColorStop(0, 'color-mix(in srgb,' + tinte + ' 18%, #33452f)');
    pasto.addColorStop(1, 'color-mix(in srgb,' + tinte + ' 12%, #25321f)');
    ctx.fillStyle = pasto; ctx.fillRect(0, groundY - 6, W, H - groundY + 6);
    // textura: matas de pasto deterministas
    for (let i = 0; i < 14; i++) {
      const gx = (i * 37 + 11) % W, gy = groundY - 4 + ((i * 53) % (H - groundY + 2));
      ctx.fillStyle = i % 2 ? '#3d5236' : '#2c3c27';
      ctx.fillRect(gx, gy, 2, 1);
    }
    // sendero de losetas hasta la puerta
    const pasos = 4;
    for (let i = 0; i < pasos; i++) {
      const t = i / (pasos - 1), py = groundY + 3 + t * (H - groundY - 5);
      const px = lerp(puertaX, W / 2, t * .3) + (i % 2 ? 3 : -3);
      ctx.fillStyle = '#8a8574'; ctx.beginPath(); ctx.ellipse(px, py, 3.4, 2, 0, 0, 7); ctx.fill();
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
    ORDEN_TRAMO.forEach((tramo, i) => {
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

  /* ══════════════════ una parcela (canvas propio) por hogar, en grilla ══════════════════
     Diseño anterior: una sola calle angosta por comuna, escalada a 100% de ancho — con pantallas
     grandes la fila se aplanaba a una tira larga y delgada (poca altura fija repartida entre
     muchas casas). Ahora cada hogar tiene su propio lote de tamaño fijo, así la escala no depende
     de cuántas casas haya al lado ni del ancho de la pantalla. */
  const porComuna = {};
  D.hogares.forEach(h => (porComuna[h.comuna] ??= []).push(h));
  const barrios = $('#barrios');
  const TW = 132, TH = 122, GROUND = 96;   // ancho/alto de la parcela, línea de suelo

  Object.entries(porComuna).forEach(([comuna, hogares]) => {
    const sec = document.createElement('section'); sec.className = 'barrio';
    const nDivC = hogares.filter(h => h.diverge).length;
    const tinte = COMUNA_TINT[comuna] || '--viz-neutral';
    sec.innerHTML = `<h2 class="title-l"><span class="tinte" style="background:var(${tinte})"></span>${comuna} <span class="n">${hogares.length}</span></h2>
      <p class="body-s muted">${nDivC} de ${hogares.length} con divergencia a los 24 meses · ${hogares.reduce((a, h) => a + h.integrantes.length, 0)} integrantes — techo y banderín del mismo color</p>
      <div class="casas"></div>`;
    const grid = sec.querySelector('.casas');

    hogares.forEach((h, hi) => {
      const parcela = document.createElement('div'); parcela.className = 'parcela';
      const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; parcela.append(cv);
      grid.append(parcela);
      const ctx = cv.getContext('2d');
      const cx = TW / 2;
      const puertaColor = PUERTAS[Math.floor(hash(hi * 17 + comuna.length) * PUERTAS.length)];

      // integrantes: caminan a nivel de suelo, en el patio frente a su casa. Ropa con variedad
      // propia (no codifica nada) — el techo sigue siendo la seña de comuna.
      let seq = hi * 97;
      const agentes = h.integrantes.map(p => {
        seq++;
        const homeX = cx + (hash(seq * 13) - .5) * (TW - 30);
        const homeY = GROUND - hash(seq * 17) * 3;
        return {
          hogar: h, tramo: p.tramo_edad, etiqueta: p.etiqueta,
          homeX, homeY, x: homeX, y: homeY, tx: homeX, ty: homeY,
          estado: 'quieto', proximo: performance.now() + hash(seq * 23) * 3000,
          color: ROPA[Math.floor(hash(seq * 43) * ROPA.length)], fase: hash(seq * 29) * 1000
        };
      });
      const casa = { h, x: cx, y: GROUND, w: anchoCasa(h.tipo_vivienda), hh: altoCasa(h.tipo_vivienda), tipo: h.tipo_vivienda };

      function limites() { return { minX: 10, maxX: TW - 10, minY: GROUND - 5, maxY: GROUND }; }

      function dibujar(t) {
        dibujarSuelo(ctx, TW, TH, GROUND, cx, tinte);
        dibujarCasa(ctx, casa.x, casa.y, casa.tipo, tinte, puertaColor);
        agentes.forEach(a => dibujarPersona(ctx, a.x, a.y, a.tramo, a.color, t + a.fase, a.estado === 'quieto'));
      }

      let ultimo = 0;
      function tick(t) {
        if (!reduce && t - ultimo > 40) {
          ultimo = t;
          agentes.forEach(a => {
            if (a.estado === 'quieto') {
              if (t > a.proximo) {
                const b = limites();
                a.tx = Math.max(b.minX, Math.min(b.maxX, a.homeX + (hash((seq = seq + 1) * 31) - .5) * 34));
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
        if (x >= casa.x - casa.w / 2 && x <= casa.x + casa.w / 2 && y >= casa.y - casa.hh && y <= casa.y) return { tipo: 'casa', c: casa };
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
    });

    barrios.append(sec);
  });
})();

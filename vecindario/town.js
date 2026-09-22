/* Vecindario · mecánica de "Generative Agents" (Park et al. 2023, Stanford): un pueblo de
   personajes inspeccionables uno por uno. Sin LLM generando comportamiento — cada casa es un
   hogar sintético real (03_doble.py), y lo que se abre al hacer clic es su registro real. */
(async function () {
  const D = await (await fetch('hogares.json')).json();
  const $ = s => document.querySelector(s);
  const nf = new Intl.NumberFormat('es-CL');
  const clp = x => x == null ? '—' : nf.format(Math.round(x)) + ' CLP';
  const pct = x => Math.round(100 * x) + '%';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TIPOLOGIA = { falso_positivo: 'Priorizado sin serlo', falso_negativo: 'Excluido siendo elegible',
    base_desactualizada: 'Base desactualizada', dato_nulo: 'Dato nulo', clasificacion_erronea: 'Clasificación errónea',
    deriva: 'Deriva de umbral', alucinacion_sintetica: 'Alucinación sintética' };
  const LOCUS = { ingreso_no_registrable: 'Ingreso no registrable', movilidad_residencial: 'Movilidad residencial',
    posicion_relativa_en_ranking: 'Posición relativa en el ranking', rezago_ingreso_formal: 'Rezago del ingreso formal',
    composicion_hogar: 'Composición del hogar' };
  const COMUNA_TINT = { 'Santiago': '--viz-1', 'La Pintana': '--viz-2', 'Las Condes': '--viz-3', 'Puente Alto': '--viz-seq' };
  const SPR = { casa: ['.R.', 'RRR', 'WvW'], departamento: ['RRR', 'vWv', 'WWW', 'vWv', 'WvW'], otra: ['RRR', 'WvW', 'WWW'] };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ── sprite pixel-art, mismo trazo que banner.js: techo tinta por comuna (visible desde afuera
     en la realidad); nada delata la divergencia, que no se ve desde afuera ── */
  function dibujarCasa(cv, tipo, techoVar) {
    const f = SPR[tipo] || SPR.otra, w = f[0].length, h = f.length, S = 8;
    cv.width = w * S; cv.height = h * S;
    const ctx = cv.getContext('2d');
    const techo = css(techoVar) || '#8e9099', muro = '#b9bcc6', ventana = '#1b1e24';
    f.forEach((fila, y) => [...fila].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'R' ? techo : ch === 'W' ? muro : ventana;
      ctx.fillRect(x * S, y * S, S, S);
    }));
  }

  /* ── panel de detalle: el registro real del hogar, como una ficha ── */
  const velo = $('#velo'), panel = $('#panel'), body = $('#panel-body');
  function abrir(h) {
    let html = `<h3 class="title-l">${h.comuna} · ${h.tenencia.replace('_', ' ')}</h3>
      <p class="sub body-m">${h.id} · <span style="font-family:var(--mono)">${h.estatuto}</span> — hogar sintético, no una persona real</p>
      <div class="f6">
        <b>Vivienda</b><span>${h.tipo_vivienda} · hacinamiento ${h.hacinamiento}</span>
        <b>Composición</b><span>${h.numper_t0} persona${h.numper_t0 === 1 ? '' : 's'} → ${h.numper_t24} al mes 24${h.se_mudo ? ' · se mudó' : ''}</span>
        <b>Ingreso t0</b><span>formal ${clp(h.ingreso_formal_t0)} · informal ${clp(h.ingreso_informal_t0)}</span>
        <b>Ingreso t24</b><span>formal ${clp(h.ingreso_formal_t24)} · informal ${clp(h.ingreso_informal_t24)}</span>
      </div>
      <div class="kv"><span>El registro lo prioriza</span><b>${h.registro.prioriza ? 'Sí' : 'No'}</b></div>
      <div class="kv"><span>Percentil registrado</span><b>${h.registro.percentil}</b></div>
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

  /* ── stats de cabecera ── */
  const nDiv = D.hogares.filter(h => h.diverge).length;
  $('#stats').innerHTML = [
    [`${D.n} hogares`, 'de la muestra'],
    [`${pct(nDiv / D.n)}`, `divergen (${nDiv} de ${D.n})`],
    [new Set(D.hogares.map(h => h.comuna)).size + ' comunas', 'representadas']
  ].map(([a, b]) => `<span class="chip assist">${a} · ${b}</span>`).join('');

  /* ── un barrio por comuna, casas en grilla ── */
  const porComuna = {};
  D.hogares.forEach(h => (porComuna[h.comuna] ??= []).push(h));
  const barrios = $('#barrios');
  Object.entries(porComuna).forEach(([comuna, hs]) => {
    const sec = document.createElement('section'); sec.className = 'barrio';
    const nDivC = hs.filter(h => h.diverge).length;
    sec.innerHTML = `<h2 class="title-l">${comuna} <span class="n">${hs.length}</span></h2>
      <p class="body-s muted">${nDivC} de ${hs.length} con divergencia a los 24 meses</p>
      <div class="casas"></div>`;
    const grid = sec.querySelector('.casas');
    hs.forEach(h => {
      const btn = document.createElement('button'); btn.className = 'casa-btn';
      btn.innerHTML = `<canvas></canvas><span class="id">${h.tenencia === 'arrendada' ? 'arr.' : h.tenencia === 'propia' ? 'prop.' : h.tenencia.slice(0, 6)}</span>`;
      dibujarCasa(btn.querySelector('canvas'), h.tipo_vivienda, COMUNA_TINT[comuna] || '--viz-neutral');
      btn.setAttribute('aria-label', `${h.comuna}, ${h.tenencia}, ${h.tipo_vivienda}${h.diverge ? ' — abrir registro' : ' — abrir registro'}`);
      btn.onclick = () => abrir(h);
      grid.append(btn);
    });
    barrios.append(sec);
  });

  /* parpadeo suave de ventanas, atmósfera mínima; respeta reduced-motion */
  if (!reduce) {
    setInterval(() => {
      document.querySelectorAll('.casa-btn canvas').forEach(cv => { cv.style.opacity = .85 + Math.random() * .15; });
    }, 1800);
  }
})();

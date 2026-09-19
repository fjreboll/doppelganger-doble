/* Santiago Gemelo Digital · dashboard infográfico (Material 3 + método dataviz) */
(async function () {
  const D = await (await fetch('data.json')).json();
  const $ = s => document.querySelector(s);
  const nf = new Intl.NumberFormat('es-CL');
  const pct = (x, d = 1) => (100 * x).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
  const esc = s => String(s ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COMUNAS = ['La Pintana', 'Puente Alto', 'Santiago', 'Las Condes'];
  const TIPO = {
    falso_positivo: { label: 'Priorizado sin serlo', short: 'Falso positivo', v: '--viz-2' },
    falso_negativo: { label: 'Excluido siendo elegible', short: 'Falso negativo', v: '--viz-1' },
    base_desactualizada: { label: 'Base desactualizada', short: 'Desactualizada', v: '--viz-3' },
    coincide: { label: 'Coinciden', short: 'Coincide', v: '--viz-neutral' }
  };
  const LOCUS = { ingreso_no_registrable: 'Ingreso no registrable', movilidad_residencial: 'Movilidad residencial', posicion_relativa_en_ranking: 'Posición relativa en el ranking', rezago_ingreso_formal: 'Rezago del ingreso formal', composicion_hogar: 'Composición del hogar' };
  let comuna = 'Todas', tipoCaso = 'todas', verCasos = 6;

  /* ── tema, app bar, tooltips, tablas ── */
  const root = document.documentElement;
  root.dataset.theme = 'dark';
  addEventListener('scroll', () => $('#appbar').classList.toggle('scrolled', scrollY > 4), { passive: true });
  const tt = $('#tt');
  const showTT = (e, html) => { tt.innerHTML = html; tt.classList.add('on'); const r = tt.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14; tt.style.left = Math.max(8, x) + 'px'; tt.style.top = Math.max(8, y) + 'px'; };
  const hideTT = () => tt.classList.remove('on');
  document.querySelectorAll('[data-table]').forEach(b => b.onclick = () => { const w = document.getElementById(b.dataset.table); w.classList.toggle('on'); b.querySelector('span').textContent = w.classList.contains('on') ? 'bar_chart' : 'table'; });
  const table = (id, head, rows) => { document.getElementById(id).innerHTML = `<table class="data"><thead><tr>${head.map((h, i) => `<th class="${i ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
  const sello = v => !v ? '' : `<span class="ver ${v.estado}">${v.estado === 'espejo' ? 'espejo fijado · ' + v.fecha : v.estado === 'interno' ? 'supuesto propio' : 'sin verificar'}</span>`;
  const verTitulo = v => !v ? '' : esc([v.metodo, v.nota].filter(Boolean).join(' · '));
  const width = el => el.getBoundingClientRect().width || el.parentNode.getBoundingClientRect().width;

  /* ── stats ── */
  const T = D.totales, minConf = Math.min(...D.confianza.slice(6, 12));
  const stats = [
    ['home_work', nf.format(T.hogares), 'hogares sintéticos', 'uno por hogar censado'],
    ['rule', nf.format(T.decisiones), 'decisiones con costura', 'todas trazables'],
    ['difference', nf.format(T.divergencias), 'entradas en el registro', pct(T.divergencias / T.hogares) + ' de los hogares', 'err'],
    ['do_not_disturb_on', pct(minConf, 0), 'acierto junto al umbral', 'percentil 40–45', 'err']];
  $('#stats').innerHTML = stats.map(([ic, v, l, s, c]) => `<div class="card elevated stat ${c || ''}"><div class="ic"><span class="material-symbols-outlined">${ic}</span></div><div class="label-l muted">${l}</div><div class="v">${v}</div><div class="body-s muted">${s}</div></div>`).join('');
  $('#gen').textContent = 'Datos generados el ' + D.generado + ' · base común doppelganger.db';

  /* ── filtro ── */
  $('#seg-comuna').innerHTML = ['Todas', ...COMUNAS].map(c => `<button aria-pressed="${c === comuna}" data-c="${c}">${c}</button>`).join('');
  $('#seg-comuna').onclick = e => { const b = e.target.closest('button'); if (!b) return; comuna = b.dataset.c; document.querySelectorAll('#seg-comuna button').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === comuna)); renderFiltered(); };
  const sel = () => comuna === 'Todas' ? COMUNAS : [comuna];
  const pulsar = el => { if (!el) return; el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso'); };
  /* API para el banner y la navegación: filtrar por comuna y llevar la vista al bloque correspondiente */
  window.gemelo = {
    comunas: COMUNAS,
    setComuna(c, destino = 'cien') {
      const b = document.querySelector(`#seg-comuna button[data-c="${c}"]`); if (b) b.click();
      if (destino) { window.doppelNav?.irA(destino, false); setTimeout(() => pulsar(document.querySelector(`#${destino} .card`)), 500); }
    }
  };

  /* ── 01 confianza ── */
  function renderConf() {
    const svg = d3.select('#c-conf'), W = width(svg.node()), H = 240, m = { t: 24, r: 8, b: 36, l: 44 };
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
    const x = d3.scaleBand().domain(d3.range(20)).range([m.l, W - m.r]).paddingInner(.12), y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
    svg.append('g').attr('class', 'gridline').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d => d * 100 + '%').tickSizeOuter(0)).call(g => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues([0, 4, 8, 12, 16, 19]).tickFormat(i => 'p' + i * 5).tickSizeOuter(0));
    const bw = Math.min(24, x.bandwidth());
    const barPath = (x0, y0, w, h) => { const r = Math.min(4, h, w / 2); return `M${x0},${y0 + h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + w - r}Q${x0 + w},${y0} ${x0 + w},${y0 + r}V${y0 + h}Z`; };
    svg.append('g').selectAll('path').data(D.confianza).join('path').attr('class', 'mark-hover')
      .attr('d', (c, i) => barPath(x(i) + (x.bandwidth() - bw) / 2, y(c), bw, y(0) - y(c))).attr('fill', css('--viz-seq'))
      .attr('opacity', (c, i) => (i === 8 || i === 9) ? 1 : .72)
      .on('pointermove', (e, c) => { const i = D.confianza.indexOf(c); showTT(e, `<div class="tt-sub">Vigintil p${i * 5}–p${i * 5 + 5} del registro</div><div class="tt-val">${pct(c)}</div><div>de acierto</div>`); d3.select(e.currentTarget).attr('opacity', 1); })
      .on('pointerleave', (e) => { hideTT(); const i = D.confianza.indexOf(d3.select(e.currentTarget).datum()); d3.select(e.currentTarget).attr('opacity', (i === 8 || i === 9) ? 1 : .72); });
    const ux = x(8) - x.step() * .06;
    svg.append('line').attr('x1', ux).attr('x2', ux).attr('y1', m.t - 8).attr('y2', H - m.b).attr('stroke', css('--md-on-surface')).attr('stroke-width', 1);
    svg.append('text').attr('x', ux + 6).attr('y', m.t - 10).attr('font-size', 12).attr('fill', css('--md-on-surface')).attr('font-weight', 500).text('umbral p40');
    const i9 = 8; svg.append('text').attr('x', x(i9) + x.bandwidth() / 2).attr('y', y(D.confianza[i9]) - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', css('--md-on-surface')).text(pct(D.confianza[i9], 0));
    table('t-conf', ['Vigintil del registro', 'Confianza'], D.confianza.map((c, i) => [`p${i * 5}–p${i * 5 + 5}`, pct(c)]));
    $('#ins-conf').textContent = `Entre p40 y p50 el registro acierta ${pct(D.confianza[8], 0)}–${pct(D.confianza[9], 0)} de las veces. Casi un volado, y ninguna interfaz lo dice.`;
  }

  /* ── 02 waffle ── */
  function composicion(r) {
    const d = r.divergencia, raw = { falso_positivo: d * r.falso_positivo, falso_negativo: d * r.falso_negativo, base_desactualizada: d * r.base_desactualizada, coincide: 1 - d };
    const ks = Object.keys(raw), fl = ks.map(k => Math.floor(raw[k] * 100)); let rest = 100 - d3.sum(fl);
    ks.map((k, i) => [i, raw[k] * 100 - fl[i]]).sort((a, b) => b[1] - a[1]).slice(0, rest).forEach(([i]) => fl[i]++);
    return { raw, n: Object.fromEntries(ks.map((k, i) => [k, fl[i]])) };
  }
  function renderWaffle() {
    $('#lg-waffle').innerHTML = Object.entries(TIPO).map(([k, t]) => `<span><span class="sw" style="background:var(${t.v})"></span>${t.label}</span>`).join('');
    const box = $('#c-waffle'); box.innerHTML = '';
    const rows = [];
    sel().forEach(c => {
      const r = D.resumen.find(x => x.comuna === c), { raw, n } = composicion(r);
      const div = document.createElement('div'); div.className = 'waffle';
      div.innerHTML = `<h4 class="title-m">${c}</h4><p class="body-s muted" style="margin-bottom:8px">${nf.format(r.hogares)} hogares · divergencia ${pct(r.divergencia)}</p>`;
      box.append(div);
      const cells = []; Object.keys(TIPO).forEach(k => { for (let i = 0; i < n[k]; i++) cells.push(k); });
      const S = 22, G = 2, svg = d3.select(div).append('svg').attr('viewBox', `0 0 ${10 * S} ${10 * S}`).attr('role', 'img').attr('aria-label', `De cada 100 hogares en ${c}`);
      svg.selectAll('rect').data(cells).join('rect').attr('class', 'mark-hover')
        .attr('x', (k, i) => (i % 10) * S + G / 2).attr('y', (k, i) => Math.floor(i / 10) * S + G / 2).attr('width', S - G).attr('height', S - G).attr('rx', 4)
        .attr('fill', k => css(TIPO[k].v))
        .on('pointermove', (e, k) => { showTT(e, `<div class="tt-sub">${c}</div><div class="tt-val">${pct(raw[k])}</div><div><span class="key" style="background:${css(TIPO[k].v)}"></span>${TIPO[k].label}</div><div class="body-s">≈ ${nf.format(Math.round(raw[k] * r.hogares))} hogares</div>`); d3.select(e.currentTarget).attr('opacity', .75); })
        .on('pointerleave', e => { hideTT(); d3.select(e.currentTarget).attr('opacity', 1); });
      const big = Object.entries(n).filter(([k]) => k !== 'coincide').sort((a, b) => b[1] - a[1])[0];
      div.insertAdjacentHTML('beforeend', `<p class="body-m" style="margin-top:8px"><b>${n.coincide}</b> coinciden · <b>${100 - n.coincide}</b> divergen</p>`);
      rows.push([c, pct(raw.coincide), pct(raw.falso_positivo), pct(raw.falso_negativo), pct(raw.base_desactualizada), nf.format(r.hogares)]);
    });
    table('t-waffle', ['Comuna', 'Coincide', 'Falso positivo', 'Falso negativo', 'Desactualizada', 'Hogares'], rows);
  }

  /* ── 03 serie mensual (small multiples, misma escala) ── */
  function renderSerie() {
    const box = $('#c-serie'); box.innerHTML = '';
    const ymax = d3.max(D.serie, d => d.divergencia) * 1.15, rows = [];
    const cards = sel().map(c => { const card = document.createElement('div'); box.append(card); return [c, card]; });
    cards.forEach(([c, card]) => {
      const s = D.serie.filter(d => d.comuna === c);
      const d0 = s[0].divergencia, d24 = s[s.length - 1].divergencia;
      card.innerHTML = `<h4 class="title-m">${c}</h4><p class="body-s muted">${pct(d0)} → <b style="color:var(--md-on-surface)">${pct(d24)}</b> · +${((d24 - d0) * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })} p.p.</p>`;
      const W = Math.max(240, box.querySelector('div').getBoundingClientRect().width), H = 190, svg = d3.select(card).append('svg').attr('class', 'chart-svg'), m = { t: 16, r: 44, b: 28, l: 38 };
      svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).attr('preserveAspectRatio', 'xMinYMin meet');
      const x = d3.scaleLinear().domain([0, 24]).range([m.l, W - m.r]), y = d3.scaleLinear().domain([0, ymax]).range([H - m.b, m.t]).nice();
      svg.append('g').attr('class', 'gridline').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickSize(-(W - m.l - m.r)).tickFormat(''));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat(d => Math.round(d * 100) + '%').tickSizeOuter(0)).call(g => g.select('.domain').remove());
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues([0, 6, 12, 18, 24]).tickFormat(d => 'm' + d).tickSizeOuter(0));
      const col = css('--viz-seq');
      svg.append('path').datum(s).attr('fill', col).attr('opacity', .1).attr('d', d3.area().x(d => x(d.mes)).y0(y(0)).y1(d => y(d.divergencia)));
      svg.append('path').datum(s).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x(d => x(d.mes)).y(d => y(d.divergencia)));
      svg.append('circle').attr('cx', x(24)).attr('cy', y(d24)).attr('r', 4).attr('fill', col).attr('stroke', css('--md-surface-container-lowest')).attr('stroke-width', 2);
      svg.append('text').attr('x', x(24) + 8).attr('y', y(d24) + 4).attr('font-size', 12).attr('fill', css('--md-on-surface')).text(pct(d24, 0));
      const hair = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', css('--viz-muted')).attr('stroke-width', 1).attr('opacity', 0);
      const dot = svg.append('circle').attr('r', 4).attr('fill', col).attr('stroke', css('--md-surface-container-lowest')).attr('stroke-width', 2).attr('opacity', 0);
      svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
        .on('pointermove', e => { const [px] = d3.pointer(e); const mes = Math.max(0, Math.min(24, Math.round(x.invert(px)))), d = s[mes];
          hair.attr('x1', x(mes)).attr('x2', x(mes)).attr('opacity', 1); dot.attr('cx', x(mes)).attr('cy', y(d.divergencia)).attr('opacity', 1);
          showTT(e, `<div class="tt-sub">${c} · mes ${mes}</div><div class="tt-val">${pct(d.divergencia)}</div><div>divergen</div><hr class="divider" style="margin:8px 0"><div class="row"><span>Priorizado sin serlo</span><b>${pct(d.falso_positivo)}</b></div><div class="row"><span>Excluido siendo elegible</span><b>${pct(d.falso_negativo)}</b></div><div class="row"><span>Se mudó</span><b>${pct(d.mudados)}</b></div><div class="row"><span>Hogar cambió</span><b>${pct(d.composicion_desactualizada)}</b></div>`); })
        .on('pointerleave', () => { hideTT(); hair.attr('opacity', 0); dot.attr('opacity', 0); });
      s.filter(d => d.mes % 6 === 0).forEach(d => rows.push([`${c} · mes ${d.mes}`, pct(d.divergencia), pct(d.falso_positivo), pct(d.falso_negativo), pct(d.mudados)]));
    });
    table('t-serie', ['Comuna · mes', 'Divergencia', 'Prioriza sin elegibilidad', 'Elegible no priorizado', 'Mudados'], rows);
  }

  /* ── 04 dumbbell ── */
  function renderDumb() {
    const svg = d3.select('#c-dumb'), W = width(svg.node()), rowH = 56, m = { t: 8, r: 20, b: 30, l: 96 }, H = m.t + m.b + rowH * COMUNAS.length;
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
    const x = d3.scaleLinear().domain([0, .65]).range([m.l, W - m.r]), y = d3.scaleBand().domain(COMUNAS).range([m.t, H - m.b]);
    svg.append('g').attr('class', 'gridline').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4).tickSize(-(H - m.t - m.b)).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(d => Math.round(d * 100) + '%').tickSizeOuter(0));
    const ink = css('--md-on-surface'), surf = css('--md-surface-container-lowest'), rshCol = css('--viz-3');
    const rsh = c => D.contexto?.[c]?.rsh?.['0-40'];
    D.resumen.forEach(r => {
      const on = comuna === 'Todas' || comuna === r.comuna, cy = y(r.comuna) + y.bandwidth() / 2, q = rsh(r.comuna);
      const vals = [r.elegibles_situado, r.priorizados_registro].concat(q != null ? [q] : []);
      const g = svg.append('g').attr('opacity', on ? 1 : .35).attr('class', 'mark-hover');
      g.append('text').attr('x', m.l - 12).attr('y', cy + 4).attr('text-anchor', 'end').attr('font-size', 14).attr('fill', ink).text(r.comuna);
      g.append('line').attr('x1', x(d3.min(vals))).attr('x2', x(d3.max(vals))).attr('y1', cy).attr('y2', cy).attr('stroke', css('--viz-axis')).attr('stroke-width', 2);
      g.append('circle').attr('cx', x(r.elegibles_situado)).attr('cy', cy).attr('r', 6).attr('fill', surf).attr('stroke', ink).attr('stroke-width', 2);
      g.append('circle').attr('cx', x(r.priorizados_registro)).attr('cy', cy).attr('r', 6).attr('fill', ink).attr('stroke', surf).attr('stroke-width', 2);
      if (q != null) g.append('rect').attr('x', x(q) - 5.5).attr('y', cy - 5.5).attr('width', 11).attr('height', 11).attr('transform', `rotate(45 ${x(q)} ${cy})`).attr('fill', rshCol).attr('stroke', surf).attr('stroke-width', 2);
      g.append('rect').attr('x', m.l).attr('y', y(r.comuna)).attr('width', W - m.l - m.r).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('click', () => window.gemelo.setComuna(comuna === r.comuna ? 'Todas' : r.comuna, null)).on('pointermove', e => showTT(e, `<div class="tt-sub">${r.comuna}</div><div class="row"><span>Registro simulado</span><b>${pct(r.priorizados_registro)}</b></div><div class="row"><span>RSH 2023, tramo 40%</span><b>${q != null ? pct(q) : '—'}</b></div><div class="row"><span>Vida situada</span><b>${pct(r.elegibles_situado)}</b></div><div class="body-s" style="margin-top:6px">RSH: hogares inscritos, no todos. Clic: filtrar.</div>`)).on('pointerleave', hideTT);
    });
    table('t-dumb', ['Comuna', 'Registro simulado', 'RSH 2023 (tramo 40%)', 'Vida situada'], D.resumen.map(r => [r.comuna, pct(r.priorizados_registro), rsh(r.comuna) != null ? pct(rsh(r.comuna)) : '—', pct(r.elegibles_situado)]));
  }

  /* ── 05 locus ── */
  function renderLocus() {
    const agg = d3.rollups(D.locus.filter(d => sel().includes(d.comuna)), v => d3.sum(v, d => d.n), d => d.tipologia + '|' + d.locus).map(([k, n]) => { const [t, l] = k.split('|'); return { t, l, n }; }).sort((a, b) => b.n - a.n);
    $('#lg-locus').innerHTML = ['falso_positivo', 'falso_negativo', 'base_desactualizada'].map(k => `<span><span class="sw" style="background:var(${TIPO[k].v})"></span>${TIPO[k].short}</span>`).join('');
    const svg = d3.select('#c-locus'), W = width(svg.node()), rowH = 44, m = { t: 4, r: 64, b: 8, l: 8 }, H = m.t + m.b + rowH * agg.length;
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
    const x = d3.scaleLinear().domain([0, d3.max(agg, d => d.n)]).range([m.l, W - m.r]), tot = d3.sum(agg, d => d.n);
    agg.forEach((d, i) => {
      const y0 = m.t + i * rowH, g = svg.append('g').attr('class', 'mark-hover');
      g.append('text').attr('x', m.l).attr('y', y0 + 14).attr('font-size', 13).attr('fill', css('--md-on-surface'))
        .text(`${LOCUS[d.l] || d.l} · ${TIPO[d.t].short.toLowerCase()}`);
      const w = Math.max(2, x(d.n) - m.l), h = 12, by = y0 + 22;
      g.append('path').attr('d', `M${m.l},${by}H${m.l + w - 4}Q${m.l + w},${by} ${m.l + w},${by + 4}V${by + h - 4}Q${m.l + w},${by + h} ${m.l + w - 4},${by + h}H${m.l}Z`).attr('fill', css(TIPO[d.t].v));
      g.append('text').attr('x', m.l + w + 8).attr('y', by + 10).attr('font-size', 12).attr('fill', css('--md-on-surface-variant')).text(nf.format(d.n));
      g.append('rect').attr('x', 0).attr('y', y0).attr('width', W).attr('height', rowH).attr('fill', 'transparent')
        .on('pointermove', e => showTT(e, `<div class="tt-sub">${LOCUS[d.l] || d.l}</div><div class="tt-val">${nf.format(d.n)}</div><div><span class="key" style="background:${css(TIPO[d.t].v)}"></span>${TIPO[d.t].short} · ${pct(d.n / tot)} de las entradas</div>`)).on('pointerleave', hideTT);
    });
    table('t-locus', ['Tipología · locus', 'Entradas', '% del total'], agg.map(d => [`${TIPO[d.t].short} · ${LOCUS[d.l] || d.l}`, nf.format(d.n), pct(d.n / tot)]));
  }

  /* ── 06 casos ── */
  const chipsTipo = [['todas', 'Todas'], ['falso_positivo', 'Falso positivo'], ['falso_negativo', 'Falso negativo'], ['base_desactualizada', 'Desactualizada']];
  $('#chips-tipo').innerHTML = chipsTipo.map(([k, l]) => `<button class="chip" aria-pressed="${k === tipoCaso}" data-k="${k}">${l}</button>`).join('');
  $('#chips-tipo').onclick = e => { const b = e.target.closest('button'); if (!b) return; tipoCaso = b.dataset.k; verCasos = 6; document.querySelectorAll('#chips-tipo .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === tipoCaso)); renderCasos(); };
  function renderCasos() {
    const todos = D.casos.filter(c => (tipoCaso === 'todas' || c.tipologia === tipoCaso) && sel().includes(c.afectado.comuna)), cs = todos.slice(0, verCasos);
    const EV = { perdida_formal: 'pérdida de empleo formal', ingreso_informal: 'ingreso informal', formalizacion: 'formalización', cambio_composicion: 'cambio de composición', mudanza: 'mudanza' };
    $('#casos').innerHTML = cs.length ? cs.map(c => {
      const R = c.representacion, O = c.ocurrido, A = c.afectado, F = c.formulacion, t = TIPO[c.tipologia];
      const ev = Object.entries(O.eventos_mes || {}).map(([k, v]) => `${EV[k] || k} (mes ${v})`).join(' · ');
      return `<article class="card outlined case">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="label-m muted" style="font-family:var(--mono)">${esc(c.id)}</span><span class="badge sec">caso compuesto</span></div>
        <div class="chip-set"><span class="chip assist"><span class="swatch" style="background:var(${t.v})"></span>${t.short}</span><span class="chip assist">${esc(LOCUS[c.locus] || c.locus)}</span></div>
        <div class="fields">
          <span class="num">1</span><div><div class="lab">Qué representó</div>${esc(R.prediccion)} · percentil ${esc(R.percentil_registro)} · ${esc(R.numper_registrado)} ${+R.numper_registrado === 1 ? 'persona registrada' : 'personas registradas'}</div>
          <span class="num">2</span><div><div class="lab">Qué decidió</div>${esc(c.decision)}</div>
          <span class="num">3</span><div><div class="lab">Qué ocurrió</div>Percentil situado ${esc(O.percentil_situado)} · ${O.reside_en_comuna ? 'reside en la comuna' : 'se mudó'} · ${esc(O.numper_real)} ${+O.numper_real === 1 ? 'persona' : 'personas'}${ev ? '<br><span class="muted">' + esc(ev) + '</span>' : ''}</div>
          <span class="num">4</span><div><div class="lab">Quién resultó afectado</div>Hogar de ${esc(A.numper)} en ${esc(A.comuna)}, tenencia ${esc(String(A.tenencia).replace('_', ' / '))}</div>
          <span class="num">5</span><div><div class="lab">Qué reparación hubo</div>${esc(c.reparacion || 'Ninguna')}</div>
          <span class="num">6</span><div><div class="lab">Quién la formuló</div>${esc(F.quien)} · reconocimiento institucional: ${esc(F.reconocimiento_institucional)}</div>
        </div>
        <div class="seam"><b>Costura</b> · confianza ${pct(R.confianza, 0)} · dato con ${esc(R.antiguedad_meses)} meses · umbral p${esc(R.umbral)} · ${esc(R.procedencia)}</div>
      </article>`; }).join('') : '<p class="body-m muted">No hay casos de esta tipología en la muestra para la comuna seleccionada.</p>';
    const mas = $('#mas-casos'); mas.style.display = todos.length > cs.length ? 'inline-flex' : 'none'; mas.querySelector('.n').textContent = `Ver ${todos.length - cs.length} entradas más`;
  }

  /* ── 07 método ── */
  $('#val').innerHTML = D.validacion.map(v => `<div class="check ${v.ok ? 'ok' : 'bad'}"><span class="material-symbols-outlined">${v.ok ? 'check_circle' : 'error'}</span><div><div class="body-m">${esc(v.prueba)}</div><div class="body-s muted">${esc(typeof v.detalle === 'object' ? Object.entries(v.detalle).map(([k, x]) => k + ': ' + x).join(' · ') : v.detalle)}</div></div></div>`).join('')
    + `<p class="body-s muted" style="margin-top:12px">${D.validacion.filter(v => v.ok).length} de ${D.validacion.length} pruebas superadas. La prueba fallida se mantiene visible.</p>`;
  $('#cal').innerHTML = `<table class="data"><thead><tr><th>Comuna</th><th class="n">Donantes</th><th class="n">Pesos g</th><th class="n">Hacin. crítico sint. / Censo</th><th class="n">Pobreza sint. / SAE [IC]</th></tr></thead><tbody>${D.calibracion.map(c => `<tr><td>${c.comuna}</td><td class="n">${c.donantes}</td><td class="n">${c.g_min.toFixed(2)}–${c.g_max.toFixed(2)}</td><td class="n">${pct(c.hac_crit_sint)} / ${pct(c.hac_crit_censo)}</td><td class="n">${pct(c.pobreza_ing_sint)} / ${pct(c.pobreza_sae)} [${pct(c.sae_li)}–${pct(c.sae_ls)}]</td></tr>`).join('')}</tbody></table>`;
  const P = D.parametros, PL = { p_perdida_formal_mes: 'Pérdida de empleo formal (mensual)', p_informal_tras_perdida_mes: 'Paso a informalidad tras pérdida', fraccion_ingreso_informal: 'Fracción del ingreso recuperada informalmente', p_formalizacion_mes: 'Formalización (mensual)', p_nacimiento_mes: 'Nacimiento (mensual)', p_salida_miembro_mes: 'Salida de un miembro (mensual)', p_actualiza_composicion_mes: 'Actualización de composición en el registro', p_actualiza_domicilio_mes: 'Actualización de domicilio en el registro', ventana_ingreso_registro_meses: 'Ventana de ingreso del registro (meses)', p_mudanza_mes: 'Mudanza (mensual)', umbral_percentil: 'Umbral de priorización (percentil)', escala_equivalencia: 'Escala de equivalencia' };
  $('#param').innerHTML = `<table class="data"><tbody>${Object.entries(PL).map(([k, l]) => `<tr><td>${l}</td><td class="n">${esc(P[k])}</td><td>${k === 'p_mudanza_mes' ? '<span class="badge pri">Censo 2024</span>' : ['umbral_percentil', 'escala_equivalencia'].includes(k) ? '<span class="badge sec">regla</span>' : '<span class="badge err">supuesto</span>'}</td></tr>`).join('')}</tbody></table>`;
  $('#auto').innerHTML = D.autorregistro.map(a => `<details class="exp"><summary><span class="material-symbols-outlined" style="color:var(--md-error)">report</span><span><span class="label-m muted">${esc(a.componente)}</span><br><span class="title-s">${esc(a.que_registro)}</span></span></summary><div class="body"><table class="data"><tbody><tr><td class="muted">Efecto</td><td>${esc(a.efecto)}</td></tr><tr><td class="muted">Inexactitud</td><td>${esc(a.inexactitud)}</td></tr><tr><td class="muted">Detección</td><td>${esc(a.deteccion)}</td></tr><tr><td class="muted">Corrección</td><td>${esc(a.correccion || 'No requerida')}</td></tr></tbody></table></div></details>`).join('');
  $('#fuentes').innerHTML = `<table class="data"><thead><tr><th>Fuente</th><th>Año</th><th>Acceso</th><th>Plano</th><th>Verificación</th><th>Homologación</th></tr></thead><tbody>${D.fuentes.map(f => `<tr><td>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(f.nombre)}<div class="body-s muted">${esc(f.institucion)}</div></td><td>${esc(f.anio_referencia)}</td><td class="body-s" style="font-family:var(--mono)">${f.acceso_url ? `<a href="${esc(f.acceso_url)}" target="_blank" rel="noopener">${esc(f.via_acceso)}</a>` : esc(f.via_acceso)}</td><td><span class="badge ${f.plano_evidencia === 'documentado' ? 'pri' : 'err'}">${esc(f.plano_evidencia)}</span></td><td class="body-s" title="${verTitulo(f.verificacion)}">${sello(f.verificacion)}</td><td class="body-s muted">${esc(f.nota_homologacion)}</td></tr>`).join('')}</tbody></table>`;

  $('#mas-casos').onclick = () => { verCasos += 6; renderCasos(); };

  /* ── 01 hogar: factores y casas/departamentos ── */
  const FACT = [
    ['Comuna de residencia', 'c', ['sit'], 'el registro usa el domicilio registrado; la vida situada exige seguir viviendo ahí'],
    ['Número de hogares', 'c', ['no'], 'fija cuántos hogares sintéticos hay (559.440)'],
    ['Personas por tramo de edad (5)', 'c', ['no'], 'calibración demográfica'],
    ['Tenencia de la vivienda', 'c', ['no'], 'propia · arrendada · cedida · irregular'],
    ['Tipo de vivienda', 'd', ['no'], 'casa · departamento · otra', 'viv'],
    ['Hacinamiento', 'd', ['no'], 'solo para validar contra Censo'],
    ['Personas del hogar', 'd', ['reg', 'sit'], 'registro: declaradas, se actualizan con rezago'],
    ['Ingreso formal (cotización o boleta)', 'd', ['reg', 'sit'], 'registro: promedio de 12 meses'],
    ['Pensiones, subsidios y otros registrables', 'd', ['reg', 'sit'], ''],
    ['Ingreso informal y otros no registrables', 'd', ['sit'], 'invisible para el registro'],
    ['Eventos de 24 meses', 's', ['sit'], 'el registro los ve tarde o nunca']
  ];
  $('#fx-factores').innerHTML = FACT.map(([n, o, uso, nota, cls]) => `<li class="${cls || ''}"><span><b>${n}</b>${nota ? `<br><span>${nota}</span>` : ''}</span><span class="fx-tag ${o}">${{ c: 'Censo', d: 'CASEN', s: 'Simulación' }[o]}</span><span class="fx-uso" aria-label="${uso.includes('no') ? 'no se usa en la clasificación' : 'lo usa: ' + uso.map(u => u === 'reg' ? 'registro' : 'vida situada').join(' y ')}">${['reg', 'sit'].map(u => uso.includes('no') ? (u === 'sit' ? '<span class="k no">—</span>' : '<span class="k off"></span>') : `<span class="k ${uso.includes(u) ? u : 'off'}">${u === 'reg' ? 'R' : 'S'}</span>`).join('')}</span></li>`).join('');

  // enlaces del diagrama: cada factor ilumina la lectura que lo usa; el tipo de vivienda lleva al gráfico
  document.querySelectorAll('#fx-factores li').forEach((li, i) => {
    const uso = FACT[i][2];
    li.tabIndex = 0;
    const on = v => document.querySelectorAll('.fx-rule.reg, .fx-rule.sit').forEach(r => r.classList.toggle('fx-on', v && uso.some(u => r.classList.contains(u))));
    const off = v => document.querySelectorAll('.fx-rule.reg, .fx-rule.sit').forEach(r => r.classList.toggle('fx-off', v && uso.includes('no')));
    li.addEventListener('pointerenter', () => { on(true); off(true); }); li.addEventListener('pointerleave', () => { on(false); off(false); });
    li.addEventListener('focus', () => { on(true); off(true); }); li.addEventListener('blur', () => { on(false); off(false); });
    if (FACT[i][4] === 'viv') {
      li.classList.add('fx-link'); li.setAttribute('role', 'link'); li.title = 'Ver casas y departamentos ante la regla';
      const ir = () => { const card = document.getElementById('c-viv-p').closest('.card'); const y = card.getBoundingClientRect().top + scrollY - 88; scrollTo({ top: y, behavior: 'smooth' }); setTimeout(() => pulsar(card), 450); };
      li.addEventListener('click', ir); li.addEventListener('keydown', e => { if (e.key === 'Enter') ir(); });
    }
  });
  document.querySelectorAll('.fx-tipo').forEach(t => { t.style.cursor = 'pointer'; t.addEventListener('click', () => document.querySelector('#fx-factores li.viv')?.click()); });

  function renderViv() {
    const V = D.vivienda_clasificacion; if (!V) return;
    const ink = css('--md-on-surface'), surf = css('--md-surface-container-lowest');
    const dibujar = (id, campo, max) => {
      const svg = d3.select(id), W = width(svg.node()), rowH = 44, m = { t: 6, r: 16, b: 28, l: 92 }, H = m.t + m.b + rowH * COMUNAS.length;
      svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
      const x = d3.scaleLinear().domain([0, max]).range([m.l, W - m.r]), y = d3.scaleBand().domain(COMUNAS).range([m.t, H - m.b]);
      svg.append('g').attr('class', 'gridline').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4).tickSize(-(H - m.t - m.b)).tickFormat(''));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(d => Math.round(d * 100) + '%').tickSizeOuter(0));
      COMUNAS.forEach(c => {
        const f = V[c], cy = y(c) + y.bandwidth() / 2, a = f.casa?.[campo], b = f.departamento?.[campo];
        const g = svg.append('g').attr('class', 'mark-hover');
        g.append('text').attr('x', m.l - 12).attr('y', cy + 4).attr('text-anchor', 'end').attr('font-size', 14).attr('fill', ink).text(c);
        if (a != null && b != null) g.append('line').attr('x1', x(Math.min(a, b))).attr('x2', x(Math.max(a, b))).attr('y1', cy).attr('y2', cy).attr('stroke', css('--viz-axis')).attr('stroke-width', 2);
        if (b != null) g.append('rect').attr('x', x(b) - 5.5).attr('y', cy - 5.5).attr('width', 11).attr('height', 11).attr('rx', 1.5).attr('fill', surf).attr('stroke', ink).attr('stroke-width', 2);
        if (a != null) g.append('circle').attr('cx', x(a)).attr('cy', cy).attr('r', 6).attr('fill', ink).attr('stroke', surf).attr('stroke-width', 2);
        const fila = t => f[t] ? `<div class="row"><span>${t === 'casa' ? 'Casas' : 'Departamentos'} (${nf.format(f[t].hogares)})</span><b>${pct(f[t][campo])}</b></div>` : '';
        g.append('rect').attr('x', m.l).attr('y', y(c)).attr('width', W - m.l - m.r).attr('height', y.bandwidth()).attr('fill', 'transparent')
          .on('click', () => window.gemelo.setComuna(c)).on('pointermove', e => showTT(e, `<div class="tt-sub">${c}</div>${fila('casa')}${fila('departamento')}<div class="body-s" style="margin-top:6px">Mezcla sintética casa/depto: ${pct(f.casa?.share_sintetico ?? 0, 0)} / ${pct(f.departamento?.share_sintetico ?? 0, 0)} · Censo 2024: ${pct(f.casa?.share_censo ?? 0, 0)} / ${pct(f.departamento?.share_censo ?? 0, 0)}</div><div class="body-s" style="margin-top:4px">Clic: ver ${c} en el tablero.</div>`)).on('pointerleave', hideTT);
      });
    };
    const todos = COMUNAS.flatMap(c => Object.values(V[c]));
    dibujar('#c-viv-p', 'priorizados', Math.max(.7, d3.max(todos, d => d.priorizados)));
    dibujar('#c-viv-d', 'divergencia', Math.max(.4, d3.max(COMUNAS.flatMap(c => ['casa', 'departamento'].map(t => V[c][t]?.divergencia || 0)))));
    const NOM = { casa: 'Casa', departamento: 'Departamento', otra: 'Otra' };
    table('t-viv', ['Comuna', 'Tipo', 'Hogares', 'Mezcla sintética', 'Censo 2024', 'Priorizados', 'Divergen', 'Falso positivo', 'Falso negativo', 'Desactualizada'],
      COMUNAS.flatMap(c => Object.entries(V[c]).map(([t, f]) => [c, NOM[t], nf.format(f.hogares), pct(f.share_sintetico), pct(f.share_censo), pct(f.priorizados), pct(f.divergencia), pct(f.falso_positivo), pct(f.falso_negativo), pct(f.desactualizada)])));
    const s = V['Santiago'], p = V['Puente Alto'];
    $('#ins-viv').innerHTML = `Mismo criterio, resultados distintos: en Santiago el registro prioriza ${pct(s.casa.priorizados, 0)} de las casas y ${pct(s.departamento.priorizados, 0)} de los departamentos; en Puente Alto se invierte (${pct(p.casa.priorizados, 0)} y ${pct(p.departamento.priorizados, 0)}). La vivienda no entra a la regla, pero viaja con el ingreso.`;
  }

  function renderFiltered() { renderWaffle(); renderSerie(); renderDumb(); renderLocus(); renderCasos(); }
  function renderAll() { renderViv(); renderConf(); renderFiltered(); }
  renderAll();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderAll, 150); });
})();

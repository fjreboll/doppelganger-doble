/* Doppelgänger · navegación compartida (Santiago Gemelo Digital y Beholder)
   Índice de secciones con seguimiento de lectura, barra de progreso, aparición progresiva de bloques,
   enlaces profundos (#seccion), botón de subida y atajos de teclado. Sin dependencias. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.getElementById('appbar');
  const main = document.querySelector('main');
  if (!header || !main) return;

  /* ── secciones ── */
  const secciones = [...main.querySelectorAll('section[id]')].map(s => {
    const num = s.dataset.n || '';
    const titulo = s.querySelector('h2, h3')?.textContent.trim() || s.id;
    const corto = s.dataset.corto || titulo;
    return { el: s, id: s.id, num, titulo, corto };
  });
  if (!secciones.length) return;

  const offset = () => header.offsetHeight + (document.querySelector('.filterbar')?.offsetHeight || 0) + 8;
  const irA = (id, foco = true) => {
    const el = document.getElementById(id); if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - offset();
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    if (foco) { el.setAttribute('tabindex', '-1'); setTimeout(() => el.focus({ preventScroll: true }), reduce ? 0 : 450); }
    history.replaceState(null, '', '#' + id);
  };
  window.doppelNav = { irA };

  /* ── barra de progreso bajo el header ── */
  const barra = document.createElement('div');
  barra.className = 'nav-progreso'; barra.setAttribute('aria-hidden', 'true');
  header.append(barra);

  /* ── índice lateral (escritorio) ── */
  const rail = document.createElement('nav');
  rail.className = 'nav-rail'; rail.setAttribute('aria-label', 'Secciones de esta página');
  rail.innerHTML = `<ol>${secciones.map(s => `<li><a href="#${s.id}" data-id="${s.id}"><span class="nr-n">${s.num || '·'}</span><span class="nr-t">${s.corto}</span></a></li>`).join('')}</ol>`;
  document.body.append(rail);

  /* ── índice dentro del menú (móvil) ── */
  const panel = document.getElementById('menu-panel');
  if (panel) {
    const sub = document.createElement('div');
    sub.className = 'nav-sub';
    sub.innerHTML = `<p class="nav-sub-t">En esta página</p>${secciones.map(s => `<a href="#${s.id}" data-id="${s.id}" class="nav-sub-a"><span class="nr-n">${s.num || '·'}</span>${s.titulo}</a>`).join('')}`;
    panel.append(sub);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-id]'); if (!a) return;
    e.preventDefault(); irA(a.dataset.id);
    if (panel?.classList.contains('on')) document.getElementById('menu-btn')?.click();
  });

  /* ── pista de desplazamiento en el banner ── */
  const banner = document.getElementById('banner');
  if (banner) {
    const cue = document.createElement('button');
    cue.className = 'nav-cue'; cue.type = 'button';
    cue.innerHTML = `<span>Explorar</span><span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>`;
    cue.setAttribute('aria-label', 'Ir a ' + secciones[0].titulo);
    cue.onclick = () => irA(secciones[0].id);
    (banner.querySelector('.px-stage') || banner).append(cue);
  }

  /* ── botón de subida ── */
  const arriba = document.createElement('button');
  arriba.className = 'fab nav-top'; arriba.type = 'button'; arriba.setAttribute('aria-label', 'Volver arriba');
  arriba.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
  arriba.onclick = () => { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname + location.search); };
  document.body.append(arriba);

  /* ── seguimiento de lectura ── */
  let activa = null, tick = false;
  const actualizar = () => {
    tick = false;
    const h = document.documentElement, max = h.scrollHeight - innerHeight;
    barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    const lim = offset() + innerHeight * .25;
    let cur = null;
    for (const s of secciones) if (s.el.getBoundingClientRect().top <= lim) cur = s;
    const pasoBanner = !banner || banner.getBoundingClientRect().bottom < header.offsetHeight + 40;
    rail.classList.toggle('on', pasoBanner);
    arriba.classList.toggle('on', pasoBanner);
    if (cur?.id !== activa) {
      activa = cur?.id || null;
      document.querySelectorAll('.nav-rail a, .nav-sub-a').forEach(a => a.toggleAttribute('aria-current', a.dataset.id === activa));
      if (activa && pasoBanner) history.replaceState(null, '', '#' + activa);
      else if (!pasoBanner && location.hash) history.replaceState(null, '', location.pathname + location.search);
    }
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(actualizar); } }, { passive: true });
  addEventListener('resize', actualizar);

  /* ── aparición progresiva (solo lo que aún no está en pantalla) ── */
  if (!reduce && 'IntersectionObserver' in window) {
    const bloques = [...main.querySelectorAll('section .sec-head, section .card, section > .grid > .card, #stats > *')];
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rv-on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    bloques.forEach((b, i) => {
      if (b.getBoundingClientRect().top < innerHeight) return;
      b.classList.add('rv'); b.style.transitionDelay = (i % 3) * 60 + 'ms'; io.observe(b);
    });
  }

  /* ── atajos: "/" busca, "t" vuelve arriba, [ y ] saltan de sección ── */
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(document.activeElement?.tagName)) return;
    if (e.key === '/' && document.getElementById('q')) { e.preventDefault(); const q = document.getElementById('q'); irA('grafo', false); setTimeout(() => q.focus({ preventScroll: true }), reduce ? 0 : 450); }
    if (e.key === 't') arriba.click();
    if (e.key === ']' || e.key === '[') {
      const i = secciones.findIndex(s => s.id === activa), j = e.key === ']' ? Math.min(secciones.length - 1, i + 1) : Math.max(0, i - 1);
      irA(secciones[i < 0 ? 0 : j].id);
    }
  });

  /* ── enlace profundo al cargar (espera a que los gráficos tengan altura) ── */
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    const id = location.hash.slice(1);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => irA(id, false), 350));
  }
  actualizar();
})();

/* Doppelgänger · visualizaciones generativas por sección
   Cada sección con [data-viz] recibe una banda de píxeles dibujada por código:
   no ilustra, opera con la misma lógica que la sección (umbral, deriva, cotejo, error).
   Sin dependencias. Se detiene fuera de pantalla y respeta prefers-reduced-motion. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = {
    fondo: '#05050a', dim: '#141821', mid: '#2b303a', gris: '#767a84', claro: '#c4c6d0',
    azul: '#3987e5', azulf: '#1c4d86', naranja: '#e0703f', verde: '#1faa78',
    rojo: '#ff8a80', rojof: '#7a2b26', blanco: '#e2e2e9', cian: '#aac7ff'
  };
  const CELDA = 5;                 // px CSS por celda
  const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111',
    '101101111001001', '111100111001111', '111100111101111', '111001001010010',
    '111101111101111', '111101111001111'];

  /* ── utilidades de dibujo sobre una grilla de 1 px por celda ── */
  const mk = (cv, cols, rows) => {
    const g = cv.getContext('2d');
    const p = {
      g, W: cols, H: rows,
      limpiar(col = C.fondo) { g.fillStyle = col; g.fillRect(0, 0, cols, rows); },
      px(x, y, col) { if (x >= 0 && y >= 0 && x < cols && y < rows) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); } },
      rect(x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
      hline(x0, x1, y, col) { p.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, col); },
      vline(x, y0, y1, col) { p.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, col); },
      punteada(x, y0, y1, col, salto = 3) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (y % salto !== salto - 1) p.px(x, y, col); },
      punteadaH(x0, x1, y, col, salto = 3) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x % salto !== salto - 1) p.px(x, y, col); },
      spr(x, y, filas, mapa, esc = 1) {
        for (let j = 0; j < filas.length; j++) for (let i = 0; i < filas[j].length; i++) {
          const c = mapa[filas[j][i]]; if (!c) continue;
          if (esc === 1) p.px(x + i, y + j, c); else p.rect(x + i * esc, y + j * esc, esc, esc, c);
        }
      },
      num(x, y, txt, col) {
        [...String(txt)].forEach((d, k) => {
          const m = DIG[+d]; if (!m) return;
          for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (m[j * 3 + i] === '1') p.px(x + k * 4 + i, y + j, col);
        });
      }
    };
    return p;
  };

  const SP = {
    casa: ['..b..', '.bbb.', 'bbbbb', 'b.w.b', 'b.w.b'],
    edif: ['bbbbb', 'b.w.b', 'bwbwb', 'b.w.b', 'bwbwb', 'b.w.b'],
    cam: ['bbbb.', 'blbbb', 'bbbb.', '.p...'],
    auto: ['.ccc.', 'aaaaf', '.o.o.'],
    sobre: ['bbbbb', 'bw.wb', 'b.w.b', 'bbbbb']
  };
  const M1 = (b, extra = {}) => Object.assign({ b, w: C.fondo, l: C.cian, p: C.gris, c: C.mid, a: b, f: C.rojo, o: C.fondo }, extra);

  /* ── motivos ─────────────────────────────────────────────────────────── */
  const M = {
    /* A · el hogar: la regla barre el parque y solo lee el ingreso */
    hogar(p, t) {
      p.limpiar();
      const suelo = p.H - 2, paso = 14, n = Math.ceil(p.W / paso);
      const haz = (t * 1.1) % (p.W + 60) - 30;
      for (let i = 0; i < n; i++) {
        const x = 3 + i * paso, dep = (i * 7919 % 100) < 36;
        const cerca = Math.abs(x + 5 - haz) < 14, est = (i * 104729 % 100);
        const col = cerca ? (est < 22 ? C.naranja : est < 42 ? C.azul : C.claro) : C.mid;
        const filas = dep ? SP.edif : SP.casa;
        p.spr(x, suelo - filas.length * 2, filas, M1(col), 2);
      }
      p.hline(0, p.W - 1, suelo, C.dim);
      for (let y = 0; y < p.H; y++) if ((y + (t | 0)) % 2) p.px(Math.round(haz), y, 'rgba(226,226,233,.45)');
    },

    /* A · la costura: la confianza se hunde junto al umbral */
    costura(p, t) {
      p.limpiar();
      const n = 20, an = Math.max(3, Math.floor((p.W - 10) / n) - 2), x0 = 5, um = 8;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(i - um), cerca = d <= 1;
        const conf = 0.26 + 0.7 * Math.min(1, d / 6);
        const h = Math.max(2, Math.round(conf * (p.H - 5)));
        const parp = cerca && !RM && Math.sin(t * 0.16 + i) > 0;
        p.rect(x0 + i * (an + 2), p.H - 3 - h, an, h, cerca ? (parp ? C.rojo : C.rojof) : d <= 3 ? C.azulf : C.azul);
      }
      p.punteada(x0 + um * (an + 2) - 2, 0, p.H - 2, C.rojo);
      p.hline(0, p.W - 1, p.H - 2, C.dim);
    },

    /* A · magnitud: cien de cada cien, los que divergen encendidos */
    cien(p, t) {
      p.limpiar();
      const cel = 3, cols = Math.floor((p.W - 6) / cel), filas = Math.max(4, Math.floor((p.H - 4) / cel));
      const total = cols * filas, vivos = RM ? total : Math.min(total, Math.floor((t * 4) % (total * 1.3)));
      for (let k = 0; k < total; k++) {
        const i = k % cols, j = (k / cols) | 0, s = (k * 7919) % 100;
        const col = k < vivos ? (s < 15 ? C.naranja : s < 24 ? C.azul : C.mid) : C.dim;
        p.rect(3 + i * cel, 2 + j * cel, cel - 1, cel - 1, col);
      }
    },

    /* A · el tiempo: dos lecturas que se separan */
    tiempo(p, t) {
      p.limpiar();
      const alto = p.H - 3, top = 3;
      for (let x = 0; x < p.W; x += 12) p.punteada(x, top, alto, C.dim, 2);
      for (let x = 0; x < p.W; x++) {
        const f = x / p.W;
        const reg = top + 2 + Math.sin(x * .06 + t * .015) * 1.2;
        const sit = reg + f * f * (p.H - top - 6) + Math.sin(x * .05 + 2) * 1.2;
        for (let y = Math.round(reg) + 1; y < Math.round(sit); y++) if ((x * 2 + y * 3 + (t | 0)) % 7 === 0) p.px(x, y, C.rojof);
        p.px(x, reg, C.claro); p.px(x, reg + 1, 'rgba(196,198,208,.35)');
        p.px(x, sit, C.naranja); p.px(x, sit - 1, 'rgba(224,112,63,.4)');
      }
      p.hline(0, p.W - 1, p.H - 1, C.dim);
    },

    /* A · tres lecturas: registro arriba, vida situada abajo, RSH entre medio */
    brecha(p, t) {
      p.limpiar();
      const n = Math.max(5, Math.floor(p.W / 34)), paso = p.W / (n + 1);
      p.hline(0, p.W - 1, p.H - 1, C.dim);
      for (let i = 0; i < n; i++) {
        const x = Math.round(paso * (i + 1));
        const a = 3 + ((i * 37) % 3), b = p.H - 4 - ((i * 53) % 4);
        p.vline(x, a, b, C.mid);
        p.rect(x - 2, a - 1, 4, 3, C.claro);
        p.rect(x - 2, b - 1, 4, 3, C.naranja);
        const d = Math.round(a + (b - a) * .55 + Math.sin(t * .04 + i) * 1.2);
        p.px(x, d - 2, C.azul); p.px(x - 1, d - 1, C.azul); p.px(x + 1, d - 1, C.azul);
        p.px(x - 2, d, C.azul); p.px(x + 2, d, C.azul);
        p.px(x - 1, d + 1, C.azul); p.px(x + 1, d + 1, C.azul); p.px(x, d + 2, C.azul);
      }
    },

    /* A · el registro: fichas de seis campos, una costura en rojo */
    fichas(p, t) {
      p.limpiar();
      const an = 34, sep = 5, n = Math.ceil(p.W / (an + sep)) + 1;
      const off = RM ? 0 : (t * .8) % (an + sep);
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * (an + sep) - off), s = ((i * 7919) % 6);
        p.rect(x, 2, an, p.H - 4, C.dim);
        p.rect(x, 2, an, 1, C.mid);
        for (let f = 0; f < 6; f++) {
          const largo = 8 + ((i * 31 + f * 17) % (an - 12));
          p.rect(x + 3, 5 + f * ((p.H - 10) / 5), largo, 1, f === s ? C.rojo : f === 0 ? C.claro : C.gris);
        }
      }
    },

    /* A/C · método: paquetes que atraviesan compuertas y alguno cae */
    metodo(p, t) {
      p.limpiar();
      const y = Math.round(p.H / 2) - 1, n = 6;
      p.punteadaH(0, p.W - 1, y + 2, C.dim, 2);
      for (let i = 1; i <= n; i++) { const x = Math.round(p.W * i / (n + 1)); p.punteada(x, 2, p.H - 3, C.gris, 2); p.rect(x - 1, 2, 3, 1, C.mid); p.rect(x - 1, p.H - 3, 3, 1, C.mid); }
      for (let k = 0; k < 30; k++) {
        const v = 0.55 + (k % 5) * .12, x = RM ? (k * p.W / 30) : ((t * v + k * 29) % (p.W + 24)) - 12;
        const caido = (k % 6) === 4 && x > p.W * .58;
        const yy = caido ? Math.min(p.H - 3, y + Math.round((x - p.W * .58) * .2)) : y;
        p.rect(x, yy, 3, 3, caido ? C.rojo : C.cian);
      }
    },

    /* C · la red: pulsos que viajan al centro */
    red(p, t) {
      p.limpiar();
      const cx = Math.round(p.W * .52), cy = Math.round(p.H / 2), n = 13;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + .35, k = i % 3 === 0 ? 1 : i % 3 === 1 ? .72 : .44;
        const rx = p.W * .40 * k, ry = (p.H / 2 - 3) * k;
        const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
        const pasos = 26;
        for (let s = 2; s < pasos - 2; s++) if (s % 2 === 0) p.px(Math.round(x + (cx - x) * s / pasos), Math.round(y + (cy - y) * s / pasos), C.mid);
        const col = i % 5 === 0 ? C.naranja : i % 7 === 3 ? C.rojo : C.azul;
        const f = RM ? .5 : ((t * .012 + i / n) % 1);
        p.rect(Math.round(x + (cx - x) * f), Math.round(y + (cy - y) * f), 2, 2, C.cian);
        p.rect(x - 1, y - 1, 3, 3, col);
      }
      p.rect(cx - 2, cy - 2, 5, 5, C.blanco);
      p.rect(cx - 4, cy - 4, 9, 1, C.mid); p.rect(cx - 4, cy + 4, 9, 1, C.mid);
    },

    /* C · la vida del dato: cámara, lectura, evento, alerta */
    dato(p, t) {
      p.limpiar();
      const base = p.H - 3, ciclo = RM ? 120 : (t * 1.5) % 240;
      p.punteadaH(0, p.W - 1, base, C.dim, 2);
      p.spr(4, 3, SP.cam, M1(C.claro), 2);
      const xa = Math.round(-14 + ciclo * (p.W + 28) / 240);
      p.spr(xa, base - 6, SP.auto, M1(C.gris, { c: C.mid }), 2);
      const leido = xa > 2 && xa < 22;
      if (leido) for (let y = 11; y < base; y++) if ((y + (t | 0)) % 2) p.px(10 + Math.round((y - 11) * .5), y, 'rgba(170,199,255,.5)');
      for (let k = 0; k < 5; k++) {
        const f = ((ciclo / 240) + k * .2) % 1;
        if (f < .12) continue;
        const x = Math.round(26 + f * (p.W - 46));
        p.spr(x, 3, SP.sobre, M1(k % 3 === 0 ? C.cian : C.mid, { w: C.fondo }), 1);
      }
      const alerta = !RM && (ciclo % 60) < 26;
      p.rect(p.W - 9, 3, 7, 7, alerta ? C.rojo : C.rojof);
      p.rect(p.W - 7, 10, 3, base - 11, C.mid);
      if (alerta) { p.px(p.W - 12, 2, C.rojo); p.px(p.W - 13, 1, C.rojo); p.px(p.W - 1, 2, C.rojo); }
    },

    /* C · antirregistro: marcos vacíos que parpadean */
    vacios(p, t) {
      p.limpiar();
      const an = 22, sep = 8, n = Math.floor((p.W - 6) / (an + sep));
      for (let i = 0; i < n; i++) {
        const x = 5 + i * (an + sep), on = RM ? (i % 3 === 0) : Math.sin(t * .05 + i * 1.7) > .4;
        const c = on ? C.rojo : C.rojof;
        for (let k = 0; k < an; k++) if (k % 3 !== 2) { p.px(x + k, 3, c); p.px(x + k, p.H - 4, c); }
        for (let k = 3; k <= p.H - 4; k++) if (k % 3 !== 2) { p.px(x, k, c); p.px(x + an - 1, k, c); }
        if (on) p.spr(x + (an >> 1) - 2, (p.H >> 1) - 4, ['.rrr.', 'r...r', '...r.', '..r..', '.....', '..r..'], { r: C.rojo });
      }
    },

    /* C · mercado: constituciones por año */
    mercado(p, t) {
      p.limpiar();
      const v = [6, 9, 14, 23, 41, 66, 52], an = Math.max(6, Math.floor((p.W - 12) / v.length) - 6);
      const mx = Math.max(...v), cr = RM ? 1 : Math.min(1, ((t % 300) / 110));
      v.forEach((y, i) => {
        const h = Math.max(1, Math.round((y / mx) * (p.H - 6) * cr));
        const x = 6 + i * (an + 6);
        p.rect(x, p.H - 3 - h, an, h, i === v.length - 1 ? C.naranja : C.azul);
        p.rect(x, p.H - 3 - h, an, 1, C.cian);
      });
      p.hline(0, p.W - 1, p.H - 2, C.dim);
    },

    /* C · tabla: filas barridas por el cursor */
    tabla(p, t) {
      p.limpiar();
      const fil = Math.max(3, Math.floor((p.H - 4) / 4)), act = RM ? 1 : Math.floor(t * .12) % fil;
      for (let j = 0; j < fil; j++) {
        const y = 3 + j * 4, on = j === act;
        let x = 5;
        for (let c = 0; c < 8; c++) {
          const w = 10 + ((j * 31 + c * 17) % 26);
          if (x + w > p.W - 5) break;
          p.rect(x, y, w, 1, on ? (c === 4 ? C.verde : C.claro) : C.mid);
          x += w + 5;
        }
        if (on) p.rect(2, y - 1, 2, 3, C.verde);
      }
    }
  };

  /* ── montaje ─────────────────────────────────────────────────────────── */
  let cuadro = 0, activo = false;
  const pintar = (b, t) => {
    if (!b.p) return;
    b.motivo(b.p, t);
    if (b.n) { b.p.rect(2, 2, 4 * String(b.n).length + 3, 7, 'rgba(5,5,10,.72)'); b.p.num(4, 3, b.n, 'rgba(226,226,233,.30)'); }
  };
  const bandas = [];
  document.querySelectorAll('[data-viz]').forEach(host => {
    const motivo = M[host.dataset.viz]; if (!motivo) return;
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    host.append(cv);
    const b = { host, cv, motivo, n: host.dataset.n || '', p: null, cols: 0, rows: 0, visible: false };
    const medir = () => {
      const r = host.getBoundingClientRect(); if (!r.width) return;
      b.cols = Math.max(20, Math.round(r.width / CELDA));
      b.rows = Math.max(8, Math.round(r.height / CELDA));
      cv.width = b.cols; cv.height = b.rows;
      b.p = mk(cv, b.cols, b.rows);
      pintar(b, cuadro);
    };
    b.medir = medir;
    bandas.push(b);
    new ResizeObserver(medir).observe(host);
    medir();
  });
  if (!bandas.length) return;

  const io = new IntersectionObserver(es => {
    es.forEach(e => { const b = bandas.find(x => x.host === e.target); if (b) b.visible = e.isIntersecting; });
    const hay = bandas.some(b => b.visible);
    if (hay && !activo) { activo = true; requestAnimationFrame(bucle); }
    if (!hay) activo = false;
  }, { rootMargin: '120px 0px' });
  bandas.forEach(b => io.observe(b.host));

  const bucle = () => {
    if (!activo) return;
    cuadro += 1;
    bandas.forEach(b => { if (b.visible) pintar(b, cuadro); });
    if (RM) { activo = false; return; }          // un solo cuadro si se pidió menos movimiento
    setTimeout(() => requestAnimationFrame(bucle), 1000 / 24);
  };
  requestAnimationFrame(bucle);
  activo = true;
})();

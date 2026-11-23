(() => {
  'use strict';

  // ---------- Distribución de las casillas (como un calendario real: desordenado) ----------
  // Cada número ocupa las celdas donde aparece. 6x6 en escritorio, 4x9 en móvil.
  const MAPA_ESCRITORIO = `
    07 07 14 03 21 21
    07 07 09 03 18 01
    12 24 24 16 05 10
    19 24 24 16 23 23
    02 15 15 08 22 11
    20 13 06 04 22 17`;
  const MAPA_MOVIL = `
    07 07 14 03
    07 07 09 03
    21 21 18 01
    12 05 24 24
    16 10 24 24
    16 19 23 23
    02 15 15 08
    22 11 20 13
    22 06 04 17`;

  function areas(mapa) {
    const filas = mapa.trim().split('\n').map((f) => f.trim().split(/\s+/).map(Number));
    const res = {};
    filas.forEach((fila, r) => fila.forEach((dia, c) => {
      const a = res[dia] || (res[dia] = { r1: r, r2: r, c1: c, c2: c });
      a.r1 = Math.min(a.r1, r); a.r2 = Math.max(a.r2, r);
      a.c1 = Math.min(a.c1, c); a.c2 = Math.max(a.c2, c);
    }));
    return res;
  }
  const AREAS_D = areas(MAPA_ESCRITORIO);
  const AREAS_M = areas(MAPA_MOVIL);
  const css = (a) => `${a.r1 + 1} / ${a.c1 + 1} / ${a.r2 + 2} / ${a.c2 + 2}`;

  // ---------- Diseños de las puertas ----------
  const DISENOS = [
    { c1: '#b3202a', patron: 'radial-gradient(circle, rgba(255,255,255,.22) 0 2.5px, transparent 3.5px)', tam: '18px 18px' },
    { c1: '#1f6b45', patron: 'repeating-linear-gradient(45deg, rgba(255,255,255,.09) 0 6px, transparent 6px 14px)', tam: 'auto' },
    { c1: '#efe0c0', patron: 'radial-gradient(circle, rgba(164,22,26,.22) 0 2px, transparent 3px)', tam: '16px 16px', etiqueta: '#a4161a', num: '#fbf3e4' },
    { c1: '#c9922f', patron: 'linear-gradient(45deg, rgba(255,255,255,.12) 25%, transparent 25% 75%, rgba(255,255,255,.12) 75%), linear-gradient(45deg, rgba(255,255,255,.12) 25%, transparent 25% 75%, rgba(255,255,255,.12) 75%)', tam: '20px 20px', etiqueta: '#fbf3e4' },
    { c1: '#173b5c', patron: 'radial-gradient(circle, rgba(255,255,255,.3) 0 1.5px, transparent 2.5px), radial-gradient(circle, rgba(255,255,255,.18) 0 1px, transparent 2px)', tam: '22px 22px, 13px 13px' },
    { c1: '#f6f0e6', patron: 'repeating-linear-gradient(-45deg, #c8252b 0 8px, transparent 8px 18px)', tam: 'auto', etiqueta: '#fbf3e4' },
  ];
  const ADORNOS = ['❄️', '⭐', '🎄', '🔔', '🕯️', '🦌', '🍪', '🧦', '☃️', '🎀', '🍬', '✨'];
  const GRANDES = new Set([7, 24]);

  // ---------- Estado ----------
  const params = new URLSearchParams(location.search);
  const qsApi = new URLSearchParams();
  if (params.get('preview')) qsApi.set('preview', params.get('preview'));
  if (params.get('dia')) qsApi.set('dia', params.get('dia'));

  let datos = null;
  let desfase = 0;           // hora del servidor - hora del móvil
  let abiertas = new Set();  // casillas ya abiertas (se recuerdan en este dispositivo)
  let claveGuardado = '';
  let diaEnCarta = null;
  const casillas = {};

  const $ = (id) => document.getElementById(id);
  const rejilla = $('rejilla');

  function leerGuardado() {
    if (datos.preview) return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(claveGuardado) || '[]')); }
    catch { return new Set(); }
  }
  function guardar() {
    if (datos.preview) return;
    try { localStorage.setItem(claveGuardado, JSON.stringify([...abiertas])); } catch {}
  }

  async function cargar() {
    const r = await fetch('/api/calendario' + (qsApi.toString() ? '?' + qsApi : ''), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    datos = await r.json();
    desfase = datos.ahora - Date.now();
    claveGuardado = `adviento-${datos.anio}-abiertas`;
    abiertas = leerGuardado();
  }

  // ---------- Construcción ----------
  function construir() {
    rejilla.innerHTML = '';
    for (let dia = 1; dia <= 24; dia++) {
      const d = DISENOS[(dia * 5) % DISENOS.length];
      const grande = GRANDES.has(dia);
      const el = document.createElement('div');
      el.className = 'casilla bloqueada sin-animacion' + (grande ? ' grande' : '');
      el.style.setProperty('--area-d', css(AREAS_D[dia]));
      el.style.setProperty('--area-m', css(AREAS_M[dia]));
      el.style.setProperty('--c1', d.c1);
      el.style.setProperty('--patron', d.patron);
      el.style.setProperty('--patron-tam', d.tam);
      if (d.etiqueta) el.style.setProperty('--etiqueta', d.etiqueta);
      if (d.num) el.style.setProperty('--num', d.num);

      const numero = `<div class="numero"><span>${dia}</span></div>`;
      const adorno = `<span class="adorno" aria-hidden="true">${ADORNOS[(dia * 7) % ADORNOS.length]}</span>`;
      const hoja = (lado, conNumero) => `
        <div class="hoja ${lado}">
          <div class="cara frente">${conNumero ? numero + adorno : ''}</div>
          <div class="cara dorso"></div>
        </div>`;

      el.innerHTML = `
        <div class="interior" aria-hidden="true">
          <span class="i-emoji">🎁</span>
          <span class="i-texto">Regalo ${dia}</span>
        </div>
        <button class="puerta ${grande ? 'doble' : ''}" type="button" aria-label="Día ${dia}">
          ${grande ? hoja('izq', false) + hoja('der', false) : hoja('', true)}
          ${grande ? `<div class="sello">${numero}</div>` : ''}
        </button>
        <span class="candado" aria-hidden="true">🔒</span>`;

      el.querySelector('.puerta').addEventListener('click', () => pulsar(dia));
      rejilla.appendChild(el);
      casillas[dia] = el;
    }
  }

  function diaDeHoy() {
    const ahora = Date.now() + desfase;
    const d = datos.dias.find((x) => x.desbloqueado && ahora < x.abre + 86400000);
    return d ? d.dia : null;
  }

  function pintar() {
    $('para').textContent = datos.para ? `Para ${datos.para}` : '';
    $('titulo').textContent = datos.titulo || 'Calendario de Adviento';
    $('dedicatoria').textContent = datos.dedicatoria || '';
    $('bannerPrueba').hidden = !datos.preview;
    document.title = datos.titulo || 'Calendario de Adviento';

    const hoy = diaDeHoy();
    datos.dias.forEach((d) => {
      const el = casillas[d.dia];
      el.classList.toggle('bloqueada', !d.desbloqueado);
      el.classList.toggle('disponible', d.desbloqueado);
      el.classList.toggle('abierta', d.desbloqueado && abiertas.has(d.dia));
      el.classList.toggle('hoy', d.dia === hoy);
      el.querySelector('.etiqueta-hoy')?.remove();
      if (d.dia === hoy && !abiertas.has(d.dia)) {
        el.insertAdjacentHTML('beforeend', '<span class="etiqueta-hoy">¡Hoy!</span>');
      }
      if (d.desbloqueado) el.querySelector('.i-emoji').textContent = d.emoji || '🎁';
      const estado = !d.desbloqueado ? 'cerrada hasta su día' : abiertas.has(d.dia) ? 'abierta' : 'lista para abrir';
      el.querySelector('.puerta').setAttribute('aria-label', `Día ${d.dia}, ${estado}`);
    });

    if (datos.mensajeFinal) $('pieTexto').textContent = datos.mensajeFinal;
    // Tras el primer pintado, activamos las transiciones.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.values(casillas).forEach((el) => el.classList.remove('sin-animacion'));
    }));
  }

  // ---------- Interacción ----------
  function pulsar(dia) {
    const d = datos.dias[dia - 1];
    const el = casillas[dia];
    if (!d.desbloqueado) {
      el.classList.remove('tiembla'); void el.offsetWidth; el.classList.add('tiembla');
      setTimeout(() => el.classList.remove('tiembla'), 900);
      sonidoBloqueado();
      avisar(mensajeBloqueado(d));
      return;
    }
    if (abiertas.has(dia)) { mostrarCarta(dia); return; }

    abiertas.add(dia); guardar();
    el.classList.add('abierta');
    el.querySelector('.etiqueta-hoy')?.remove();
    campanilla();
    setTimeout(() => chispas(el), 450);
    setTimeout(() => mostrarCarta(dia), 1300);
  }

  function mensajeBloqueado(d) {
    const falta = d.abre - (Date.now() + desfase);
    const dias = Math.ceil(falta / 86400000);
    const frases = [
      '¡Ey! Esa todavía no 🙈',
      'Paciencia, que es una virtud 😌',
      'Nada de hacer trampas 😏',
      'Esa casilla sigue dormida 💤',
    ];
    const frase = frases[d.dia % frases.length];
    if (dias <= 1) return `${frase} Se abre a medianoche 🌙`;
    return `${frase} Se abre el ${d.dia} de diciembre (faltan ${dias} días)`;
  }

  let temporizadorAviso;
  function avisar(texto) {
    const a = $('aviso');
    a.textContent = texto;
    a.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => a.classList.remove('visible'), 2800);
  }

  function chispas(el) {
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'chispa';
      const ang = (Math.PI * 2 * i) / 16 + Math.random() * .4;
      const dist = 40 + Math.random() * 50;
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      if (i % 3 === 0) s.style.background = '#fff';
      el.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  function mostrarCarta(dia) {
    const d = datos.dias[dia - 1];
    diaEnCarta = dia;
    $('cartaNumero').textContent = dia;
    $('cartaFecha').textContent = `${dia} de diciembre`;
    $('cartaEmoji').textContent = d.emoji || '🎁';
    $('cartaTitulo').textContent = d.titulo || `Regalo nº ${dia}`;
    $('cartaFrase').textContent = d.frase || '';
    $('cartaInstruccion').textContent = `nº ${dia}`;
    $('modal').hidden = false;
    // Reinicia la animación de entrada
    const carta = document.querySelector('.carta');
    carta.style.animation = 'none'; void carta.offsetWidth; carta.style.animation = '';
    $('cartaBoton').focus({ preventScroll: true });
  }
  function cerrarCarta() {
    $('modal').hidden = true;
    if (diaEnCarta) casillas[diaEnCarta].querySelector('.puerta').focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarCarta));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal').hidden) cerrarCarta(); });
  $('cartaBoton').addEventListener('click', () => {
    confeti();
    fanfarria();
    cerrarCarta();
    if (diaEnCarta === 24) setTimeout(() => avisar('🎄 ¡Feliz Navidad! 🎄'), 600);
  });

  // ---------- Cuenta atrás ----------
  function dos(n) { return String(n).padStart(2, '0'); }
  function tic() {
    const cuenta = $('cuenta');
    if (!datos || !datos.siguienteApertura || datos.preview && !params.get('dia')) { cuenta.hidden = true; return; }
    const falta = datos.siguienteApertura - (Date.now() + desfase);
    if (falta <= 0) {
      cuenta.hidden = true;
      refrescar();
      return;
    }
    const s = Math.floor(falta / 1000);
    const dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    const empezado = datos.dias[0].desbloqueado;
    $('cuentaTexto').textContent = empezado ? 'Próxima casilla en' : 'El calendario empieza en';
    $('cuentaReloj').textContent = (dd ? `${dd}d ` : '') + `${dos(hh)}:${dos(mm)}:${dos(ss)}`;
    cuenta.hidden = false;
  }
  let refrescando = false;
  async function refrescar() {
    if (refrescando) return;
    refrescando = true;
    try { await cargar(); pintar(); avisar('✨ ¡Hay una casilla nueva!'); campanilla(); }
    catch { /* se reintenta en el siguiente tic */ }
    finally { setTimeout(() => { refrescando = false; }, 5000); }
  }
  // Al volver a la pestaña (p. ej. el móvil estuvo bloqueado), se sincroniza.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && datos) {
      try { await cargar(); pintar(); } catch {}
    }
  });

  // ---------- Sonido ----------
  let audio = null;
  let sonidoActivo = true;
  try { sonidoActivo = localStorage.getItem('adviento-sonido') !== 'no'; } catch {}
  const botonSonido = $('botonSonido');
  function pintarBotonSonido() {
    botonSonido.textContent = sonidoActivo ? '🔔' : '🔕';
    botonSonido.setAttribute('aria-pressed', String(sonidoActivo));
  }
  pintarBotonSonido();
  botonSonido.addEventListener('click', () => {
    sonidoActivo = !sonidoActivo;
    try { localStorage.setItem('adviento-sonido', sonidoActivo ? 'si' : 'no'); } catch {}
    pintarBotonSonido();
    if (sonidoActivo) campanilla();
  });
  function ctx() {
    if (!sonidoActivo) return null;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch { return null; }
  }
  function nota(ac, freq, inicio, dur, vol, tipo = 'sine') {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(0, inicio);
    g.gain.linearRampToValueAtTime(vol, inicio + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    o.connect(g).connect(ac.destination);
    o.start(inicio); o.stop(inicio + dur + 0.05);
  }
  function campanilla() {
    const ac = ctx(); if (!ac) return;
    const t = ac.currentTime;
    [1318.5, 1760, 2093, 2637].forEach((f, i) => {
      nota(ac, f, t + i * 0.09, 1.4, 0.07);
      nota(ac, f * 2.76, t + i * 0.09, 0.5, 0.015);
    });
  }
  function fanfarria() {
    const ac = ctx(); if (!ac) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(ac, f, t + i * 0.11, 0.9, 0.08, 'triangle'));
  }
  function sonidoBloqueado() {
    const ac = ctx(); if (!ac) return;
    const t = ac.currentTime;
    nota(ac, 220, t, 0.15, 0.06, 'triangle');
    nota(ac, 196, t + 0.12, 0.2, 0.06, 'triangle');
  }

  // ---------- Nieve ----------
  (function nieve() {
    const cv = $('nieve'), c = cv.getContext('2d');
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let copos = [], w, h, dpr;
    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(160, innerWidth / 7));
      copos = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 2.2 + .6) * dpr,
        v: (Math.random() * .6 + .3) * dpr,
        f: Math.random() * Math.PI * 2,
        o: Math.random() * .5 + .35,
      }));
    }
    medir(); addEventListener('resize', medir);
    function paso() {
      c.clearRect(0, 0, w, h);
      for (const p of copos) {
        p.y += p.v; p.f += .01; p.x += Math.sin(p.f) * .35 * dpr;
        if (p.y > h + 5) { p.y = -5; p.x = Math.random() * w; }
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fillStyle = `rgba(255,255,255,${p.o})`; c.fill();
      }
      if (!reducido) requestAnimationFrame(paso);
    }
    paso();
  })();

  // ---------- Confeti ----------
  function confeti() {
    const cv = $('confeti'), c = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const colores = ['#d0282d', '#f4d58d', '#1f6b45', '#ffffff', '#d9a441', '#8fe3a3'];
    const piezas = Array.from({ length: 180 }, () => ({
      x: cv.width / 2 + (Math.random() - .5) * 80 * dpr,
      y: cv.height * .55,
      vx: (Math.random() - .5) * 18 * dpr,
      vy: (-Math.random() * 18 - 8) * dpr,
      w: (Math.random() * 8 + 5) * dpr, h: (Math.random() * 5 + 3) * dpr,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      col: colores[Math.floor(Math.random() * colores.length)],
    }));
    const inicio = performance.now();
    (function paso(t) {
      const dt = t - inicio;
      c.clearRect(0, 0, cv.width, cv.height);
      for (const p of piezas) {
        p.vy += .45 * dpr; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r);
        c.globalAlpha = Math.max(0, 1 - dt / 3200);
        c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.r * 2));
        c.restore();
      }
      if (dt < 3200) requestAnimationFrame(paso); else c.clearRect(0, 0, cv.width, cv.height);
    })(inicio);
  }

  // ---------- Arranque ----------
  (async function iniciar() {
    try {
      await cargar();
      construir();
      pintar();
      tic();
      setInterval(tic, 1000);
    } catch (e) {
      rejilla.innerHTML = '<p class="cargando">No he podido cargar el calendario. Recarga la página en unos segundos 🎄</p>';
      setTimeout(iniciar, 6000);
    }
  })();
})();

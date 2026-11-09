// cabeza -> cola
const SERPIENTES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
// pie -> tope
const ESCALERAS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
// Casillas "?": ±3 según la respuesta. Elegidas para que ±3 nunca caiga en serpiente, escalera u otra "?" (ver autochequeo).
const CASILLAS_PREGUNTA = [8, 22, 29, 40, 55, 63, 76, 89];
const JUGADORES = [
  { nombre: 'Rojo', color: '#e53935', claro: '#ff9a8f', oscuro: '#8e1b1b', desfase: [-2, -1.5] },
  { nombre: 'Azul', color: '#1e88e5', claro: '#9bd0ff', oscuro: '#0d4a8f', desfase: [2, 1.5] },
];
const COLORES = ['#2e8b57', '#c0392b', '#8e44ad', '#16a085', '#d35400'];
const movimiento = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const VEL = movimiento ? 1 : 0; // multiplica las duraciones; 0 = sin animaciones

// Tablero en zigzag: la 1 abajo a la izquierda, cada fila cambia de sentido.
function filaCol(n) {
  const i = n - 1, fila = Math.floor(i / 10);
  return { fila, col: fila % 2 ? 9 - (i % 10) : i % 10 };
}

// Centro de la casilla en coordenadas del SVG (100x100, 10 por casilla).
function centro(n) {
  const { fila, col } = filaCol(n);
  return [col * 10 + 5, (9 - fila) * 10 + 5];
}

// ---------- Tablero ----------
const tablero = document.querySelector('.tablero');
const casillas = document.getElementById('casillas');
for (let r = 9; r >= 0; r--) {
  for (let c = 0; c < 10; c++) {
    const n = r * 10 + (r % 2 ? 10 - c : c + 1);
    const div = document.createElement('div');
    div.className = 'casilla' + ((r + c) % 2 ? ' oscura' : '') + (CASILLAS_PREGUNTA.includes(n) ? ' pregunta' : '');
    div.textContent = n;
    div.style.animationDelay = `${n * 6}ms`;
    casillas.appendChild(div);
  }
}

function perpendicular([x1, y1], [x2, y2], ancho) {
  const dx = x2 - x1, dy = y2 - y1, largo = Math.hypot(dx, dy);
  return [(-dy / largo) * ancho, (dx / largo) * ancho, largo];
}

const linea = (x1, y1, x2, y2, retraso) =>
  `<path class="trazo" pathLength="1" d="M${x1},${y1}L${x2},${y2}" style="animation-delay:${retraso}s"/>`;

function escalera(desde, hasta, retraso) {
  const a = centro(desde), b = centro(hasta);
  const [px, py, largo] = perpendicular(a, b, 2.2);
  let s = linea(a[0] + px, a[1] + py, b[0] + px, b[1] + py, retraso) +
    linea(a[0] - px, a[1] - py, b[0] - px, b[1] - py, retraso);
  const peldaños = Math.max(2, Math.round(largo / 5));
  for (let k = 1; k < peldaños; k++) {
    const x = a[0] + (b[0] - a[0]) * k / peldaños, y = a[1] + (b[1] - a[1]) * k / peldaños;
    s += linea(x + px, y + py, x - px, y - py, retraso + 0.4 + k * 0.05);
  }
  return `<g stroke="#7a4a1e" stroke-width="1.2" stroke-linecap="round">${s}</g>`;
}

// Curva en S de cabeza a cola; k1/k2 = cuánto se abre cada curva (se varían para ondular).
function curvaSerpiente(cabeza, cola, k1 = 6, k2 = 6) {
  const a = centro(cabeza), b = centro(cola);
  const [px, py] = perpendicular(a, b, 1);
  const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const [c1x, c1y] = at(1 / 3), [c2x, c2y] = at(2 / 3);
  return [a, [c1x + px * k1, c1y + py * k1], [c2x - px * k2, c2y - py * k2], b];
}
const trazado = ([a, c1, c2, b]) => `M${a}C${c1} ${c2} ${b}`;

function puntoBezier([p0, p1, p2, p3], t) {
  const u = 1 - t;
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
}

const colorSerpiente = {};
function serpiente(cabeza, cola, color, i, retraso) {
  colorSerpiente[cabeza] = color;
  const curva = curvaSerpiente(cabeza, cola), d = trazado(curva);
  const ondula = movimiento ? `<animate attributeName="d" dur="${3 + i * 0.4}s" repeatCount="indefinite" values="${
    [d, trazado(curvaSerpiente(cabeza, cola, 3, 8)), d, trazado(curvaSerpiente(cabeza, cola, 8, 3)), d].join(';')}"/>` : '';
  const lengua = movimiento ? `<animateTransform attributeName="transform" type="scale" values="0 1;0 1;1 1;1 1;0 1" keyTimes="0;.6;.7;.85;1" dur="${1.6 + i * 0.3}s" repeatCount="indefinite"/>` : '';
  const [a, c1] = curva;
  const angulo = Math.atan2(a[1] - c1[1], a[0] - c1[0]) * 180 / Math.PI;
  const ojo = y => `<circle cx="1" cy="${y}" r=".75" fill="#fff"/><circle cx="1.3" cy="${y}" r=".38" fill="#111"/>`;
  return `<path class="trazo" pathLength="1" d="${d}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" style="animation-delay:${retraso}s">${ondula}</path>` +
    `<path class="aparece" d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.1" stroke-dasharray=".6 1.8" stroke-linecap="round" style="animation-delay:${retraso + 0.9}s">${ondula}</path>` +
    `<g class="aparece" transform="translate(${a}) rotate(${angulo})" style="animation-delay:${retraso + 0.9}s"><g class="cabeza" data-cabeza="${cabeza}">` +
    `<path d="M2.4,0H4.4l.8-.7M4.4,0l.8.7" fill="none" stroke="#e53935" stroke-width=".4" stroke-linecap="round">${lengua}</path>` +
    `<ellipse rx="3" ry="2.3" fill="${color}"/><ellipse class="boca" cx="2.2" rx="1.2" ry="1.7" fill="#3b0a0a"/>${ojo(-1.1)}${ojo(1.1)}</g></g>`;
}

const svg = document.getElementById('dibujos');
const nEscaleras = Object.keys(ESCALERAS).length;
// Peón con degradado para que tenga volumen; su sombra es un dibujo aparte que el CSS corre con la inclinación.
const peon = (j, i) => `<g class="ficha aparece"><ellipse class="sombra" cx=".8" cy="2" rx="2.9" ry="1.1" opacity=".35"/><g class="peon" stroke="#fff" stroke-width=".3">` +
  `<ellipse cy="1.5" rx="2.7" ry="1.1" fill="${j.oscuro}"/>` +
  `<path d="M-2.3,1.3C-1.5,0-.9-.8-.8-1.8H.8C.9-.8,1.5,0,2.3,1.3Z" fill="url(#peon${i})"/>` +
  `<circle cy="-2.6" r="1.6" fill="url(#peon${i})"/><circle cx="-.55" cy="-3.1" r=".45" fill="#fff" opacity=".6" stroke="none"/></g></g>`;
svg.innerHTML =
  `<defs>${JUGADORES.map((j, i) => `<radialGradient id="peon${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${j.claro}"/><stop offset=".55" stop-color="${j.color}"/><stop offset="1" stop-color="${j.oscuro}"/></radialGradient>`).join('')}</defs>` +
  Object.entries(ESCALERAS).map(([d, h], i) => escalera(+d, h, 0.8 + i * 0.15)).join('') +
  Object.entries(SERPIENTES).map(([c, t], i) => serpiente(+c, t, COLORES[i % COLORES.length], i, 0.8 + (nEscaleras + i) * 0.15)).join('') +
  JUGADORES.map(peon).join('');
const fichas = [...svg.querySelectorAll('.ficha')];

// ---------- Estado ----------
const dado = document.getElementById('dado');
const cubo = document.getElementById('cubo');
const camara = document.querySelector('.camara');
const estadoEl = document.getElementById('estado');
const reiniciarBtn = document.getElementById('reiniciar');
const dificultad = document.getElementById('dificultad');
const quiz = document.getElementById('quiz');
const opcionesEl = document.getElementById('quiz-opciones');
const resultadoEl = document.getElementById('quiz-resultado');
const crearBtn = document.getElementById('crear-sala');
const copiarBtn = document.getElementById('copiar');
const enlaceEl = document.getElementById('enlace');
const salaInfo = document.getElementById('sala-info');

let posiciones, turno, nivel, azar, mazo = [];
let enJuego = false, terminado = false, quizAbierto = false;
let miJugador = null; // null = los dos juegan en esta pantalla; 0/1 = el jugador de esta pantalla en la sala
let conexion = null;

const esperar = ms => new Promise(r => setTimeout(r, ms));
const estado = texto => { estadoEl.textContent = texto; };
const tr = ([x, y, s = 1]) => `translate(${x}px,${y}px) scale(${s})`;
const esMiTurno = () => miJugador === null || (conexion !== null && miJugador === turno);

// Azar con semilla (mulberry32): con la misma semilla las dos pantallas sacan los mismos dados y preguntas.
function crearAzar(semilla) {
  return () => {
    semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(azar() * (i + 1));
    [a[i], a[k]] = [a[k], a[i]];
  }
  return a;
}

// ---------- Acciones en orden ----------
// Cada clic (propio o del amigo) entra a esta cola y las dos pantallas la procesan igual.
const cola = [];
let despertar = () => {}, esperando = null;

function recibir(msg, jugador) {
  cola.push({ ...msg, jugador });
  despertar();
}

// Acción de esta pantalla: se aplica aquí y se manda al amigo.
function accion(msg) {
  conexion?.send(msg);
  recibir(msg, miJugador ?? turno);
}

// Espera la próxima acción válida de esos tipos; descarta lo que no corresponde (p. ej. clics fuera de turno).
async function siguiente(tipos) {
  esperando = tipos;
  for (;;) {
    const m = cola.shift();
    if (!m) { await new Promise(r => { despertar = r; }); continue; }
    if (tipos.includes(m.tipo) && (m.tipo === 'inicio' || m.jugador === turno)) {
      esperando = null;
      return m;
    }
  }
}

function nuevaPartida() {
  accion({ tipo: 'inicio', semilla: Math.floor(Math.random() * 2 ** 31), dificultad: dificultad.value });
}

async function bucle() {
  for (;;) {
    const m = await siguiente(['tirar', 'inicio']);
    if (m.tipo === 'inicio') reiniciar(m);
    else await jugarTurno();
  }
}

// ---------- Animaciones de fichas ----------
// Posición 0 = salida, se dibuja sobre la casilla 1.
function lugar(j, n) {
  const [x, y] = centro(Math.max(n, 1)), [dx, dy] = JUGADORES[j].desfase;
  return [x + dx, y + dy];
}

// Con la pestaña oculta el navegador no dibuja y frena los temporizadores: se salta la animación
// para que esa pantalla se ponga al día al instante en vez de quedarse atrás en la sala.
const animando = () => VEL > 0 && !document.hidden;

// ---------- Cámara ----------
// Acerca la vista a un punto del tablero sin mostrar nunca fuera de los bordes (no se ve cortado).
const ZOOM = 1.6;
let acercada = false;
function vista([x, y]) {
  const t = v => Math.min(0, Math.max(100 - 100 * ZOOM, 50 - ZOOM * v));
  return `translate(${t(x)}%,${t(y)}%) scale(${ZOOM})`;
}
async function enfocar(p) {
  if (!animando() || acercada) return;
  acercada = true;
  camara.style.transform = vista(p);
  await esperar(450); // lo que dura la transición de CSS
}
function alejar() {
  acercada = false;
  camara.style.transform = '';
}

// Mueve un elemento del tablero por los pasos [x, y, escala] y la cámara lo acompaña.
// Lo deja en el último paso; el tope de tiempo evita que la partida se trabe si el navegador igual no dibuja.
function mover(el, pasos, ms, easing = 'ease-in-out') {
  el.style.transform = tr(pasos.at(-1));
  if (!animando()) { alejar(); return Promise.resolve(); }
  camara.style.transform = vista(pasos.at(-1));
  const anims = [
    el.animate(pasos.map(p => ({ transform: tr(p) })), { duration: ms, easing }),
    camara.animate(pasos.map(p => ({ transform: vista(p) })), { duration: ms, easing }),
  ];
  return Promise.race([anims[0].finished, esperar(ms + 200)]).then(() => anims.forEach(a => a.cancel()));
}

// Salta casilla por casilla, hacia adelante o hacia atrás.
async function avanzar(j, desde, hasta) {
  await enfocar(lugar(j, desde));
  const paso = Math.sign(hasta - desde);
  for (let n = desde; n !== hasta;) {
    const a = lugar(j, n);
    n += paso;
    const b = lugar(j, n);
    await mover(fichas[j], [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 4, 1.35], b], 260);
  }
}

// La serpiente abre la boca, se traga la ficha, el bulto baja por el cuerpo y la ficha sale por la cola.
async function deslizar(j, cabeza) {
  const cola = SERPIENTES[cabeza], ficha = fichas[j], destino = lugar(j, cola);
  if (!animando()) return mover(ficha, [destino], 0);
  const curva = curvaSerpiente(cabeza, cola), [boca0] = curva;
  const cab = svg.querySelector(`[data-cabeza="${cabeza}"]`), boca = cab.querySelector('.boca');
  const abre = { duration: 300, fill: 'forwards', easing: 'ease-out' };
  await enfocar(boca0);
  const a1 = cab.animate({ transform: ['scale(1)', 'scale(1.7)'] }, abre), a2 = boca.animate({ transform: ['scale(0)', 'scale(1)'] }, abre);
  await esperar(300);
  await mover(ficha, [lugar(j, cabeza), [...boca0, 0.2]], 350, 'ease-in');
  ficha.style.opacity = 0;
  a1.reverse();
  a2.reverse();
  await esperar(300);
  a1.cancel();
  a2.cancel();

  const bulto = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bulto.setAttribute('r', 2.5);
  bulto.setAttribute('fill', colorSerpiente[cabeza]);
  cab.parentNode.before(bulto); // debajo de la cabeza, encima del cuerpo
  await mover(bulto, Array.from({ length: 31 }, (_, k) => puntoBezier(curva, k / 30)), 1500, 'ease-in');
  bulto.remove();

  ficha.style.opacity = '';
  await mover(ficha, [[...curva[3], 0.2], [...destino, 1.3], destino], 350, 'ease-out');
}

async function trepar(j, pie) {
  const a = lugar(j, pie), b = lugar(j, ESCALERAS[pie]), pasos = 10;
  await enfocar(a);
  await mover(fichas[j], Array.from({ length: pasos + 1 }, (_, k) =>
    [a[0] + (b[0] - a[0]) * k / pasos, a[1] + (b[1] - a[1]) * k / pasos, k % 2 ? 1.2 : 1]), 1100, 'linear');
}

// ---------- Dado 3D ----------
// Giro del cubo que deja cada cara al frente (las caras se colocan en el CSS, clases c1 a c6).
const GIRO = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
const PUNTOS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const giro = ([x, y]) => `rotateX(${x}deg) rotateY(${y}deg)`;
cubo.innerHTML = Object.entries(PUNTOS).map(([n, p]) =>
  `<span class="cara c${n}">${Array.from({ length: 9 }, (_, k) => `<i${p.includes(k) ? ' class="p"' : ''}></i>`).join('')}</span>`).join('');

// El número sale del azar con semilla; el giro y el rebote son fijos, así las dos pantallas ven lo mismo.
async function tirarDado() {
  const r = 1 + Math.floor(azar() * 6), [x, y] = GIRO[r], desde = cubo.style.transform || giro(GIRO[1]);
  cubo.style.transform = giro(GIRO[r]);
  if (animando()) {
    dado.animate({
      transform: ['none', 'translateY(-70px) scale(1.15)', 'none', 'translateY(-16px)', 'none'],
      offset: [0, 0.35, 0.72, 0.86, 1],
      easing: ['ease-out', 'ease-in', 'ease-out', 'ease-in'],
    }, 1100);
    const a = cubo.animate({ transform: [desde, giro([x + 720, y + 1080])] }, { duration: 1100, easing: 'cubic-bezier(.2,.7,.3,1)' });
    await Promise.race([a.finished, esperar(1300)]);
    a.cancel();
  }
  return r;
}

// ---------- Inclinación del tablero ----------
// --ix / --iy van de -1 a 1; el CSS inclina el tablero y corre las sombras con esos valores.
if (movimiento) {
  const limite = v => Math.max(-1, Math.min(1, v || 0));
  const inclinar = (x, y) => {
    tablero.style.setProperty('--ix', limite(x));
    tablero.style.setProperty('--iy', limite(y));
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = tablero.getBoundingClientRect();
    inclinar((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
  });
  const girar = e => { if (e.gamma !== null) inclinar(e.gamma / 30, (e.beta - 45) / 30); };
  if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') { // iOS pide permiso tras un toque
    addEventListener('pointerdown', () => DeviceOrientationEvent.requestPermission()
      .then(p => { if (p === 'granted') addEventListener('deviceorientation', girar); }).catch(() => {}), { once: true });
  } else addEventListener('deviceorientation', girar);
}

// ---------- Turnos ----------
function controles() {
  dado.disabled = terminado || !esMiTurno();
  dificultad.disabled = enJuego || miJugador === 1;
  crearBtn.disabled = enJuego;
  reiniciarBtn.hidden = !terminado || miJugador === 1;
}

function marcarTurno() {
  fichas.forEach((f, k) => f.classList.toggle('turno', k === turno && !terminado));
  document.getElementById('punto').style.background = JUGADORES[turno].color;
  const quien = miJugador === null ? '' : turno === miJugador ? ' (tú)' : ' (tu amigo)';
  document.getElementById('turno-nombre').textContent = terminado ? 'Fin del juego' : `Turno de ${JUGADORES[turno].nombre}${quien}`;
  controles();
}

function pasarTurno() {
  turno = (turno + 1) % JUGADORES.length;
  marcarTurno();
}

const TEMAS = { 'Persona 3': 'p3', 'Persona 5': 'p5', 'Metaphor: ReFantazio': 'mr' };

// Muestra una pregunta en las dos pantallas; solo el jugador del turno puede responder.
async function preguntar(motivo) {
  if (!mazo.length) mazo = mezclar([...PREGUNTAS[nivel]]);
  const { juego, p, r } = mazo.pop();
  const { nombre } = JUGADORES[turno];
  document.getElementById('quiz-motivo').textContent = `${nombre} · ${motivo}`;
  document.getElementById('quiz-juego').textContent = `${juego} · ${dificultad.selectedOptions[0].text}`;
  quiz.dataset.juego = TEMAS[juego] ?? '';
  // Letra por letra: cada letra es un span animado; el lector de pantalla lee la pregunta entera del aria-label.
  const titulo = document.getElementById('quiz-pregunta');
  let i = 0;
  titulo.setAttribute('aria-label', p);
  titulo.replaceChildren(...p.split(' ').flatMap(palabra => {
    const w = document.createElement('span');
    w.className = 'palabra';
    w.ariaHidden = 'true';
    for (const letra of palabra) {
      const l = w.appendChild(document.createElement('span'));
      l.className = 'letra';
      l.textContent = letra;
      l.style.setProperty('--i', i++);
    }
    return [w, ' '];
  }));
  resultadoEl.textContent = esMiTurno() ? '' : `Esperando la respuesta de ${nombre}…`;
  opcionesEl.replaceChildren(...mezclar([...r]).map(texto => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.disabled = !esMiTurno();
    b.onclick = () => {
      if (!esperando?.includes('respuesta') || !esMiTurno()) return;
      esperando = null;
      for (const x of opcionesEl.children) x.disabled = true;
      accion({ tipo: 'respuesta', texto });
    };
    return b;
  }));
  quizAbierto = true;
  quiz.showModal();

  const { texto } = await siguiente(['respuesta']);
  const acierto = texto === r[0];
  for (const b of opcionesEl.children) {
    b.disabled = true;
    if (b.textContent === r[0]) b.classList.add('correcta');
    else if (b.textContent === texto) b.classList.add('incorrecta');
  }
  resultadoEl.textContent = acierto ? `¡${nombre} acertó!` : `${nombre} falló. Era: ${r[0]}`;
  await esperar(acierto ? 1000 : 2000); // tiempo de lectura, no se acorta con movimiento reducido
  quizAbierto = false;
  quiz.close();
  return acierto;
}
quiz.addEventListener('cancel', e => e.preventDefault()); // Esc no salta la pregunta
quiz.addEventListener('close', () => { if (quizAbierto) quiz.showModal(); }); // si el navegador igual lo cierra, se reabre

async function jugarTurno() {
  enJuego = true;
  controles();
  const j = turno, { nombre } = JUGADORES[j];
  if (!await preguntar('Acierta para tirar el dado')) {
    estado(`${nombre} falló la pregunta y pierde el turno.`);
    return pasarTurno();
  }
  const r = await tirarDado();
  let n = posiciones[j] + r;
  if (n > 100) {
    estado(`${nombre} sacó ${r}, pero necesita exactamente ${100 - posiciones[j]}.`);
  } else {
    estado(`${nombre} sacó ${r}.`);
    await avanzar(j, posiciones[j], n);
    if (SERPIENTES[n]) {
      if (await preguntar(`¡Serpiente! Acierta para no bajar a ${SERPIENTES[n]}`)) {
        estado(`¡${nombre} esquivó la serpiente!`);
      } else {
        estado(`${nombre} baja de ${n} a ${SERPIENTES[n]}.`);
        await deslizar(j, n);
        n = SERPIENTES[n];
      }
    } else if (ESCALERAS[n]) {
      if (await preguntar(`¡Escalera! Acierta para subir a ${ESCALERAS[n]}`)) {
        estado(`¡${nombre} sube de ${n} a ${ESCALERAS[n]}!`);
        await trepar(j, n);
        n = ESCALERAS[n];
      } else {
        estado(`${nombre} no pudo subir la escalera.`);
      }
    } else if (CASILLAS_PREGUNTA.includes(n)) {
      const acierto = await preguntar('Casilla ?: acierta y avanzas 3, falla y retrocedes 3');
      const destino = n + (acierto ? 3 : -3);
      estado(acierto ? `${nombre} acertó y avanza a ${destino}.` : `${nombre} falló y retrocede a ${destino}.`);
      await avanzar(j, n, destino);
      n = destino;
    }
    posiciones[j] = n;
  }
  alejar();
  if (posiciones[j] === 100) return ganar(nombre);
  pasarTurno();
}

function ganar(nombre) {
  terminado = true;
  enJuego = false;
  estado(miJugador === 1 ? `¡${nombre} ganó! 🎉 Esperando que Rojo empiece otra.` : `¡${nombre} ganó! 🎉`);
  marcarTurno();
  if (!reiniciarBtn.hidden) reiniciarBtn.focus();
  confeti();
}

function confeti() {
  if (!movimiento) return;
  const colores = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa', '#fb8c00'];
  for (let k = 0; k < 150; k++) {
    const c = document.createElement('div');
    c.className = 'confeti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colores[k % colores.length];
    document.body.appendChild(c);
    c.animate([
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: `translate(${(Math.random() - 0.5) * 200}px,110vh) rotate(${Math.random() * 1080}deg)` },
    ], { duration: 2500 + Math.random() * 2000, delay: Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'backwards' })
      .finished.then(() => c.remove());
  }
}

function reiniciar({ semilla, dificultad: d }) {
  azar = crearAzar(semilla);
  nivel = dificultad.value = d;
  mazo = [];
  posiciones = JUGADORES.map(() => 0);
  turno = 0;
  enJuego = terminado = false;
  fichas.forEach((f, j) => { f.style.transform = tr(lugar(j, 0)); });
  alejar();
  estado('Toca el dado: responde bien para poder tirar.');
  marcarTurno();
}

dado.addEventListener('click', () => {
  if (!esperando?.includes('tirar') || !esMiTurno()) return;
  esperando = null;
  accion({ tipo: 'tirar' });
});
reiniciarBtn.addEventListener('click', () => { nuevaPartida(); setTimeout(() => dado.focus()); });
dificultad.addEventListener('change', nuevaPartida); // solo se puede cambiar antes de la primera tirada

// ---------- Sala online ----------
// shortcut: empareja con el servidor público gratis de PeerJS y conecta directo por WebRTC, sin reconexión;
// si falla seguido (redes muy cerradas o el servidor caído), pasar a un backend propio tipo Firebase.
const PREFIJO = 'sye-persona-';
const info = t => { salaInfo.textContent = t; };

// Lo que llega del amigo no es de fiar: solo se aceptan mensajes con la forma esperada.
function valido(d, yo) {
  if (!d || typeof d !== 'object') return false;
  if (d.tipo === 'tirar') return true;
  if (d.tipo === 'respuesta') return typeof d.texto === 'string';
  if (d.tipo === 'inicio') return yo === 1 && Number.isInteger(d.semilla) && Object.hasOwn(PREGUNTAS, d.dificultad);
  return false;
}

function conectar(c, yo) {
  let saludo;
  const unirse = () => {
    conexion = c;
    miJugador = yo;
    info(yo ? '¡Conectado! Juegas con Azul.' : '¡Tu amigo se unió! Juegas con Rojo.');
    enlaceEl.hidden = copiarBtn.hidden = true;
    marcarTurno();
  };
  // Saludo: el invitado avisa "listo" (y lo repite hasta recibir la partida) y recién ahí el anfitrión la manda.
  // Lo que el anfitrión envía apenas se abre el canal a veces no le llega al invitado.
  if (yo === 1) {
    c.on('open', () => {
      unirse();
      c.send({ tipo: 'listo' });
      saludo = setInterval(() => c.send({ tipo: 'listo' }), 1000);
    });
  }
  c.on('data', d => {
    if (yo === 0 && d?.tipo === 'listo') {
      if (!conexion) { unirse(); nuevaPartida(); }
      return;
    }
    if (yo === 1 && d?.tipo === 'inicio') clearInterval(saludo);
    if (conexion && valido(d, yo)) recibir(d, 1 - yo);
  });
  c.on('close', () => {
    clearInterval(saludo);
    conexion = null;
    miJugador = null;
    info('Tu amigo se desconectó. Sigues en modo local en esta pantalla.');
    for (const b of opcionesEl.children) b.disabled = !esperando?.includes('respuesta');
    marcarTurno();
  });
}

crearBtn.addEventListener('click', () => {
  if (typeof Peer === 'undefined') return info('No se pudo cargar el modo online. Revisa tu conexión y recarga.');
  const codigo = Math.random().toString(36).slice(2, 8);
  const peer = new Peer(PREFIJO + codigo);
  let ocupada = false;
  miJugador = 0; // hasta que llegue el amigo nadie tira
  crearBtn.hidden = true;
  marcarTurno();
  info('Creando sala…');
  peer.on('open', () => {
    enlaceEl.value = `${location.href.split(/[?#]/)[0]}?sala=${codigo}`;
    enlaceEl.hidden = copiarBtn.hidden = false;
    info('Manda este enlace a tu amigo:');
  });
  peer.on('connection', c => {
    if (ocupada) return c.on('open', () => c.close()); // la sala es de 2
    ocupada = true;
    conectar(c, 0);
  });
  peer.on('error', e => { if (!conexion) info(`Error de conexión (${e.type}). Recarga para intentar de nuevo.`); });
});

copiarBtn.addEventListener('click', async () => {
  enlaceEl.select();
  try {
    await navigator.clipboard.writeText(enlaceEl.value);
    info('¡Enlace copiado! Pásaselo a tu amigo.');
  } catch {
    info('Copia el enlace a mano:');
  }
});

const sala = new URLSearchParams(location.search).get('sala');
if (sala !== null) {
  miJugador = 1; // invitado: espera la partida del anfitrión
  crearBtn.hidden = true;
  if (!/^[a-z0-9]{1,16}$/.test(sala)) info('El enlace de la sala no es válido.');
  else if (typeof Peer === 'undefined') info('No se pudo cargar el modo online. Revisa tu conexión y recarga.');
  else {
    info('Conectando a la sala…');
    const peer = new Peer();
    peer.on('open', () => conectar(peer.connect(PREFIJO + sala, { serialization: 'json', reliable: true }), 1));
    peer.on('error', e => { if (!conexion) info(e.type === 'peer-unavailable' ? 'La sala no existe o ya se cerró.' : `Error de conexión (${e.type}).`); });
  }
}

recibir({ tipo: 'inicio', semilla: Math.floor(Math.random() * 2 ** 31), dificultad: dificultad.value }, null);
bucle();

// Autochequeo: cada número aparece una vez y las esquinas quedan donde deben.
console.assert(new Set([...casillas.children].map(d => d.textContent)).size === 100, 'casillas repetidas');
console.assert(casillas.children[90].textContent === '1' && casillas.children[0].textContent === '100', 'zigzag mal');
console.assert(String(centro(1)) === '5,95' && String(centro(100)) === '5,5', 'centro() desalineado con la grilla');
console.assert(String(puntoBezier(curvaSerpiente(16, 6), 1)) === String(centro(6)), 'la bajada no termina en la cola');
const especiales = n => SERPIENTES[n] || ESCALERAS[n] || CASILLAS_PREGUNTA.includes(n);
console.assert(CASILLAS_PREGUNTA.every(q => !SERPIENTES[q] && !ESCALERAS[q] && q > 3 && q < 98 && !especiales(q + 3) && !especiales(q - 3)),
  'una casilla ? manda a otra casilla especial o fuera del tablero');
console.assert([...dificultad.options].every(o => PREGUNTAS[o.value]?.length), 'falta el banco de preguntas de un nivel');
console.assert(Object.values(PREGUNTAS).flat().every(q => q.p && q.r.length === 4 && new Set(q.r).size === 4), 'pregunta mal armada');
console.assert(crearAzar(42)() === crearAzar(42)() && valido({ tipo: 'inicio', semilla: 1, dificultad: 'toString' }, 1) === false,
  'el azar con semilla no es reproducible o se acepta un nivel inventado');

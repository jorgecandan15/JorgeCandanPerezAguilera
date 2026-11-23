// Calendario de Adviento — servidor sin dependencias.
// La fecha se comprueba AQUÍ (hora de Madrid), no en el navegador:
// cambiar la hora del móvil o mirar el código de la página no desvela nada.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'regalos.json');
// Clave para probar el calendario con todas las casillas abiertas: /?preview=CLAVE
const PREVIEW_KEY = process.env.PREVIEW_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function cargarDatos() {
  // Se relee en cada petición: editar regalos.json + redeploy basta.
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Diciembre en Madrid es UTC+1 (sin cambio de hora), así que la casilla N
// se abre a las 00:00 del N de diciembre = 23:00 UTC del día anterior.
function aperturaDia(anio, dia) {
  return Date.UTC(anio, 11, dia, 0, 0, 0) - 60 * 60 * 1000;
}

function estadoCalendario(query) {
  const datos = cargarDatos();
  const anio = Number(datos.anio) || new Date().getUTCFullYear();
  const preview = PREVIEW_KEY && query.get('preview') === PREVIEW_KEY;

  let ahora = Date.now();
  if (preview && query.get('dia')) {
    // Simula estar a las 12:00 de ese día de diciembre.
    const d = Math.min(24, Math.max(1, parseInt(query.get('dia'), 10) || 1));
    ahora = aperturaDia(anio, d) + 12 * 3600 * 1000;
  } else if (preview) {
    ahora = aperturaDia(anio, 25);
  }

  const dias = [];
  let siguienteApertura = null;
  for (let dia = 1; dia <= 24; dia++) {
    const abre = aperturaDia(anio, dia);
    const desbloqueado = ahora >= abre;
    const regalo = (datos.regalos || []).find((r) => Number(r.dia) === dia) || {};
    const item = { dia, desbloqueado, abre };
    if (desbloqueado) {
      item.emoji = regalo.emoji || '🎁';
      item.titulo = regalo.titulo || `Regalo nº ${dia}`;
      item.frase = regalo.frase || '';
    } else if (siguienteApertura === null) {
      siguienteApertura = abre;
    }
    dias.push(item);
  }

  return {
    anio,
    para: datos.para,
    titulo: datos.titulo,
    dedicatoria: datos.dedicatoria,
    mensajeFinal: dias[23].desbloqueado ? datos.mensajeFinal : null,
    ahora,
    siguienteApertura,
    preview: Boolean(preview),
    dias,
  };
}

function enviar(res, status, body, tipo) {
  res.writeHead(status, {
    'Content-Type': tipo,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/calendario') {
    try {
      return enviar(res, 200, JSON.stringify(estadoCalendario(url.searchParams)), 'application/json; charset=utf-8');
    } catch (err) {
      console.error(err);
      return enviar(res, 500, JSON.stringify({ error: 'No se pudo leer regalos.json' }), 'application/json; charset=utf-8');
    }
  }

  if (url.pathname === '/healthz') return enviar(res, 200, 'ok', 'text/plain');

  let ruta = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const archivo = path.normalize(path.join(PUBLIC_DIR, ruta));
  if (!archivo.startsWith(PUBLIC_DIR + path.sep)) return enviar(res, 403, 'Prohibido', 'text/plain');

  fs.readFile(archivo, (err, contenido) => {
    if (err) return enviar(res, 404, 'No encontrado', 'text/plain');
    enviar(res, 200, contenido, MIME[path.extname(archivo)] || 'application/octet-stream');
  });
});

server.listen(PORT, () => console.log(`Calendario de Adviento escuchando en :${PORT}`));

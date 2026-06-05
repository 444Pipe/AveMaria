/* =====================================================================
   Avemaria - servidor estatico sin dependencias (listo para Railway)
   - Sirve los archivos del proyecto (index.html, css, js, statics).
   - Escucha en process.env.PORT (Railway lo inyecta) o 3000 en local.
   - Soporta "Range requests" para que el video se pueda buscar/streamear.
   - Endurecido: rechaza path traversal y caracteres de control, y nunca
     deja caer el proceso por un error inesperado.
   ===================================================================== */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.ogg':  'video/ogg',
  '.mov':  'video/quicktime',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

// Detecta bytes nulos / caracteres de control (codigo < 32) sin necesidad de
// escribir caracteres de control en el codigo fuente. Evita que fs.stat lance
// y tumbe el proceso ante rutas tipo /a%00b.
function hasControlChars(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) < 32) return true;
  }
  return false;
}

// Cache por tipo: HTML siempre fresco; CSS/JS corto (para ver cambios tras
// un redeploy); imagenes/video/fuentes largo.
function cacheFor(ext) {
  if (ext === '.html') return 'no-cache';
  if (ext === '.css' || ext === '.js' || ext === '.mjs') return 'public, max-age=3600';
  return 'public, max-age=604800';
}

function send404(res) {
  const fallback = path.join(ROOT, 'index.html');
  fs.readFile(fallback, function (err, buf) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404 Not Found'); }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer(function (req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Allow': 'GET, HEAD' });
      return res.end('Method Not Allowed');
    }

    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch (e) { res.writeHead(400); return res.end('Bad Request'); }

    if (hasControlChars(urlPath)) { res.writeHead(400); return res.end('Bad Request'); }

    // Healthcheck barato (util si se configura en Railway > Settings > Healthcheck).
    if (urlPath === '/health' || urlPath === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('ok');
    }

    if (urlPath === '/') urlPath = '/index.html';

    // Resolver y bloquear path traversal (solo dentro de ROOT).
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403); return res.end('Forbidden');
    }

    fs.stat(filePath, function (err, stat) {
      if (err || !stat.isFile()) return send404(res);

      const ext   = path.extname(filePath).toLowerCase();
      const type  = MIME[ext] || 'application/octet-stream';
      const cache = cacheFor(ext);
      const total = stat.size;
      const range = req.headers.range;

      // Range request (video seek / streaming).
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        if (m) {
          let start = m[1] ? parseInt(m[1], 10) : 0;
          let end   = m[2] ? parseInt(m[2], 10) : total - 1;
          if (isNaN(start)) start = 0;
          if (isNaN(end) || end >= total) end = total - 1;
          if (start > end || start >= total) {
            res.writeHead(416, { 'Content-Range': 'bytes */' + total });
            return res.end();
          }
          res.writeHead(206, {
            'Content-Type': type,
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': (end - start + 1),
            'Cache-Control': cache
          });
          if (req.method === 'HEAD') return res.end();
          const rs = fs.createReadStream(filePath, { start: start, end: end });
          rs.on('error', function () { res.destroy(); });
          return rs.pipe(res);
        }
      }

      res.writeHead(200, {
        'Content-Type': type,
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cache
      });
      if (req.method === 'HEAD') return res.end();
      const rs = fs.createReadStream(filePath);
      rs.on('error', function () { res.destroy(); });
      rs.pipe(res);
    });
  } catch (e) {
    try { res.writeHead(500); res.end('Server error'); } catch (_) { /* respuesta ya enviada */ }
  }
});

// Red de seguridad: nunca tumbar el proceso por un error inesperado.
process.on('uncaughtException',  function (e) { console.error('uncaughtException:', e && e.message); });
process.on('unhandledRejection', function (e) { console.error('unhandledRejection:', e); });

server.listen(PORT, HOST, function () {
  console.log('Avemaria - sitio sirviendose en http://' + HOST + ':' + PORT);
});

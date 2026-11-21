import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.ico': 'image/x-icon' };

/** Servidor estático mínimo (con soporte de Range para vídeo) para ver y comprobar la carpeta dist. */
export function servirCarpeta(raiz, puerto = 0) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(raiz, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('No encontrado'); }
    const tam = fs.statSync(f).size, tipo = MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream';
    const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (rango) {
      const ini = rango[1] ? +rango[1] : 0, fin = rango[2] ? +rango[2] : tam - 1;
      res.writeHead(206, { 'content-type': tipo, 'content-range': `bytes ${ini}-${fin}/${tam}`, 'accept-ranges': 'bytes', 'content-length': fin - ini + 1 });
      return fs.createReadStream(f, { start: ini, end: fin }).pipe(res);
    }
    res.writeHead(200, { 'content-type': tipo, 'content-length': tam, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(puerto, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}/`, cerrar: () => new Promise((r) => srv.close(r)) })));
}

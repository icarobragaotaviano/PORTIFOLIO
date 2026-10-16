import { createServer as httpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './build.mjs';
import { normalizeBase } from '../src/templates.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function createServer(directory, { base = '/' } = {}) {
  base = normalizeBase(base);
  const publicRoot = resolve(directory);
  return httpServer(async (request, response) => {
    const send = (code, text) => { response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : text); };
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); send(405, 'Método não permitido.'); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (base !== '/' && pathname === base.slice(0, -1)) { response.writeHead(308, { Location: `${base}${url.search}` }); response.end(); return; }
      if (!pathname.startsWith(base)) { send(404, 'Página não encontrada.'); return; }
      const relative = pathname.slice(base.length);
      if (relative.split('/').some((part) => part.startsWith('.') || part.includes('\\')) || relative.includes('\0')) { send(403, 'Acesso negado.'); return; }
      let file = resolve(publicRoot, relative);
      if (file !== publicRoot && !file.startsWith(`${publicRoot}/`)) { send(403, 'Acesso negado.'); return; }
      let info;
      try { info = await stat(file); } catch { info = null; }
      if (info?.isDirectory()) {
        if (!pathname.endsWith('/')) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }); response.end(); return; }
        file = resolve(file, 'index.html');
      }
      let content;
      let code = 200;
      try { content = await readFile(file); }
      catch {
        code = 404;
        file = resolve(publicRoot, '404.html');
        try { content = await readFile(file); } catch { send(404, 'Execute npm run build antes de iniciar a prévia.'); return; }
      }
      response.writeHead(code, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      send(error instanceof URIError || error instanceof TypeError ? 400 : 500, 'Não foi possível abrir este endereço.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.env.BASE_PATH || '/';
  const port = Number(process.env.PORT || 4173);
  const server = createServer(resolve(root, 'dist'), { base });
  server.on('error', (error) => { console.error(`Não foi possível iniciar a prévia: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${base}`));
}

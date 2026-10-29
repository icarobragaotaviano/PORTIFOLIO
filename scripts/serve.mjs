import { createServer as httpServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './build.mjs';
import { normalizeBase } from '../src/templates.mjs';
import { createPortfolioAccess } from '../server/portfolio-access.js';
import { createPortfolioPage, createPortfolioHome } from '../server/portfolio-page.js';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function createServer(directory, { base = '/', portfolioEnv = process.env, portfolioDataDir } = {}) {
  base = normalizeBase(base);
  const publicRoot = resolve(directory);
  const portfolioAccess = createPortfolioAccess({ env: portfolioEnv, dataDir: portfolioDataDir || resolve(root, '.data/portfolio'), base, secureCookies: false, allowSetup: true });
  const portfolioPage = createPortfolioPage({ access: portfolioAccess, base });
  const portfolioHome = createPortfolioHome({ access: portfolioAccess, base });
  return httpServer(async (request, response) => {
    const send = (code, text) => { response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : text); };
    try {
      const url = new URL(request.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if ([`${base}api/portfolio`, `${base}api/portfolio.js`].includes(pathname)) {
        const chunks = []; let size = 0;
        if (!['GET', 'HEAD'].includes(request.method)) for await (const chunk of request) {
          size += chunk.length;
          if (size > 4 * 1024 * 1024 + 16384) { send(413, 'O arquivo excede o limite permitido.'); return; }
          chunks.push(chunk);
        }
        const target = new URL(request.url, `http://${request.headers?.host || 'localhost'}`);
        const handler = target.searchParams.get('action') === 'page' ? portfolioPage : target.searchParams.get('action') === 'home' ? portfolioHome : portfolioAccess;
        const result = await handler(new Request(target, { method: request.method, headers: request.headers, ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: Buffer.concat(chunks) }) }));
        for (const [name, value] of result.headers) if (name !== 'set-cookie') response.setHeader(name, value);
        const cookies = result.headers.getSetCookie();
        if (cookies.length) response.setHeader('Set-Cookie', cookies);
        response.writeHead(result.status);
        response.end(request.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); send(405, 'Método não permitido.'); return; }
      if (base !== '/' && pathname === base.slice(0, -1)) { response.writeHead(308, { Location: `${base}${url.search}` }); response.end(); return; }
      if (!pathname.startsWith(base)) { send(404, 'Página não encontrada.'); return; }
      const relative = pathname.slice(base.length);
      if (relative.split('/').some((part) => part.startsWith('.') || part.includes('\\')) || relative.includes('\0')) { send(403, 'Acesso negado.'); return; }
      if (relative.startsWith('projetos/') || relative === '' || relative === 'index.html') {
        const isProject = relative.startsWith('projetos/');
        if (isProject && /^projetos\/[a-z0-9-]+$/.test(relative)) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }); response.end(); return; }
        const target = new URL(request.url, `http://${request.headers?.host || 'localhost'}`);
        const result = await (isProject ? portfolioPage : portfolioHome)(new Request(target));
        const content = Buffer.from(await result.arrayBuffer());
        for (const [name, value] of result.headers) response.setHeader(name, value);
        response.setHeader('Content-Length', content.length);
        response.writeHead(result.status);
        response.end(request.method === 'HEAD' ? undefined : content); return;
      }
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
  try { process.loadEnvFile(resolve(root, '.env.local')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('Não foi possível carregar a configuração local.'); }
  const base = process.env.BASE_PATH || '/';
  const port = Number(process.env.PORT || 4173);
  const server = createServer(resolve(root, 'dist'), { base });
  server.on('error', (error) => { console.error(`Não foi possível iniciar a prévia: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${base}`));
}

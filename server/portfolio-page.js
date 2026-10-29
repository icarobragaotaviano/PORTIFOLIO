import { portfolioProjectPage } from '../src/portfolio-render.mjs';
import { home, normalizeBase, layout } from '../src/templates.mjs';

const htmlResponse = (request, html, status = 200, extra = {}) => new Response(request.method === 'HEAD' ? null : html, { status, headers: {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store, no-cache, max-age=0',
  'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', ...extra,
} });

/** The homepage also resolves publication state before rendering its gallery. */
export function createPortfolioHome({ access, base = '/' } = {}) {
  if (typeof access !== 'function') throw new TypeError('O acesso ao portfólio é obrigatório.');
  base = normalizeBase(base);
  const endpoint = `${base}api/portfolio`;
  return async function portfolioHome(request) {
    const url = new URL(request.url);
    const response = (html, status = 200, extra = {}) => htmlResponse(request, html, status, extra);
    if (!['GET', 'HEAD'].includes(request.method)) return response('Método não permitido.', 405, { Allow: 'GET, HEAD' });
    const api = [endpoint, `${endpoint}.js`].includes(url.pathname);
    if (api ? url.searchParams.getAll('action').length !== 1 || url.searchParams.get('action') !== 'home' : ![base, `${base}index.html`].includes(url.pathname)) return response('Página não encontrada.', 404);
    const unavailable = () => response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Portfólio indisponível — Ícaro Braga</title><h1>O portfólio estará de volta em breve.</h1><p>Não foi possível carregar os projetos. Tente novamente em alguns instantes.</p></html>', 503);
    try {
      const source = new URL(endpoint, url.origin); source.searchParams.set('action', 'public');
      const result = await access(new Request(source, { method: 'GET' }));
      if (!result.ok) return unavailable();
      const { projects } = await result.json();
      if (!Array.isArray(projects)) return unavailable();
      return response(home(base, projects.filter(project => project.publication === 'published')));
    } catch { return unavailable(); }
  };
}

/** Every project URL resolves current publication state before any HTML is served. */
export function createPortfolioPage({ access, base = '/' } = {}) {
  if (typeof access !== 'function') throw new TypeError('O acesso ao portfólio é obrigatório.');
  base = normalizeBase(base);
  const endpoint = `${base}api/portfolio`;
  return async function portfolioPage(request) {
    const url = new URL(request.url);
    const response = (html, status = 200, extra = {}) => htmlResponse(request, html, status, extra);
    const missing = () => response(layout({ base, title: 'Projeto indisponível', noindex: true, portfolioCount: 0, body: `<section class="not-found wrap"><span class="eyebrow">PROJETO INDISPONÍVEL</span><h1>Um novo olhar.</h1><p>Este projeto não está publicado no portfólio.</p><a href="${base}#projetos">Explorar os projetos disponíveis ↗</a></section>` }), 404);
    if (!['GET', 'HEAD'].includes(request.method)) return response('Método não permitido.', 405, { Allow: 'GET, HEAD' });
    let slug;
    if ([endpoint, `${endpoint}.js`].includes(url.pathname)) {
      if (url.searchParams.getAll('action').length !== 1 || url.searchParams.get('action') !== 'page' || url.searchParams.getAll('slug').length !== 1) return missing();
      slug = url.searchParams.get('slug');
    } else {
      let path;
      try { path = decodeURIComponent(url.pathname); } catch { return missing(); }
      if (!path.startsWith(`${base}projetos/`)) return missing();
      slug = path.slice(`${base}projetos/`.length).match(/^([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|\/index\.html)?$/)?.[1];
    }
    if (!slug || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return missing();
    try {
      // A single read keeps the selected project and its related projects consistent.
      const source = new URL(endpoint, url.origin); source.searchParams.set('action', 'public');
      const result = await access(new Request(source, { method: 'GET' }));
      if (!result.ok) return missing();
      const { projects } = await result.json();
      if (!Array.isArray(projects)) return missing();
      const published = projects.filter(project => project.publication === 'published');
      const project = published.find(item => item.slug === slug);
      if (!project) return missing();
      return response(portfolioProjectPage(project, base, published));
    } catch { return missing(); }
  };
}

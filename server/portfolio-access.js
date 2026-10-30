import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { projects as originalProjects } from '../src/content.mjs';
import { createPortfolioStore, PortfolioStoreError } from './portfolio-store.js';

const scrypt = promisify(scryptCallback);
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY = 4 * 1024 * 1024 + 16384;
const MAX_UPLOAD = 3 * 1024 * 1024;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const equal = (first, second) => {
  const a = Buffer.from(String(first)); const b = Buffer.from(String(second));
  return a.length === b.length && timingSafeEqual(a, b);
};
class RequestError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }

function text(value, max = 500, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new RequestError('Texto inválido ou muito longo.');
  return value.trim();
}
function enumeration(value, values, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!values.includes(value)) throw new RequestError('Opção de projeto inválida.');
  return value;
}
function passwordValue(value) {
  if (typeof value !== 'string' || value.length > 128 || /[\u0000-\u001f\u007f]/u.test(value)) throw new RequestError('Senha inválida.');
  return value;
}
function list(value, max = 20) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new RequestError('Lista inválida.');
  return [...new Set(value.map(item => text(item, 100)).filter(Boolean))];
}
function mediaUrl(value, { optional = false } = {}) {
  const raw = text(value, 2048);
  if (!raw && optional) return '';
  if (!raw || /[\s\\]/u.test(raw) || raw.startsWith('//')) throw new RequestError('Informe uma URL de mídia válida.');
  let parsed;
  try { parsed = new URL(raw, 'https://portfolio.invalid'); } catch { throw new RequestError('URL de mídia inválida.'); }
  if (parsed.username || parsed.password || (raw.startsWith('/') ? parsed.origin !== 'https://portfolio.invalid' : parsed.protocol !== 'https:')) throw new RequestError('Use uma URL HTTPS ou uma imagem do portfólio.');
  if (!raw.startsWith('/') && !/^https:\/\//i.test(raw)) throw new RequestError('Use uma URL HTTPS ou uma imagem do portfólio.');
  return raw;
}
function embeddedVideo(value) {
  const raw = mediaUrl(value);
  let parsed;
  try { parsed = new URL(raw); } catch { throw new RequestError('Use um vídeo do YouTube ou Vimeo.'); }
  const host = parsed.hostname.toLowerCase();
  let id;
  if (['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'].includes(host)) {
    id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] || (parsed.pathname === '/watch' ? parsed.searchParams.get('v') : null);
    if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    id = parsed.pathname.match(/^\/(?:video\/)?(\d{1,15})\/?$/)?.[1];
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  throw new RequestError('Use um vídeo do YouTube ou Vimeo.');
}
function imageRecord(value) {
  const image = { src: mediaUrl(value?.src), alt: text(value?.alt, 500) };
  for (const key of ['width', 'height']) {
    if (value[key] === undefined) continue;
    if (!Number.isInteger(value[key]) || value[key] < 1 || value[key] > 100000) throw new RequestError('Dimensões de imagem inválidas.');
    image[key] = value[key];
  }
  if (value.responsiveSrc !== undefined) image.responsiveSrc = mediaUrl(value.responsiveSrc);
  return image;
}
function blockRecord(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Bloco inválido.');
  const type = enumeration(value.type, ['image', 'text', 'grid', 'video', 'embed', 'divider']);
  if (!type) throw new RequestError('Tipo de bloco inválido.');
  const id = text(value.id, 80, `block-${index + 1}`);
  if (!ID.test(id)) throw new RequestError('Identificador de bloco inválido.');
  const block = {
    id, type,
    align: enumeration(value.align, ['left', 'center', 'right'], 'center'),
    size: enumeration(value.size, ['normal', 'wide', 'full'], 'full'),
    caption: text(value.caption, 1000),
  };
  if (type === 'image') Object.assign(block, imageRecord(value));
  if (type === 'text') {
    block.text = text(value.text, 30000);
    block.format = enumeration(value.format, ['paragraph', 'heading', 'subheading'], 'paragraph');
  }
  if (type === 'grid') {
    if (!Array.isArray(value.images) || value.images.length < 1 || value.images.length > 12) throw new RequestError('O mosaico aceita entre 1 e 12 imagens.');
    block.images = value.images.map(imageRecord);
    if (value.layout !== undefined) {
      if (!['uniform', 'identity', 'triptych', 'campaign'].includes(value.layout)) throw new RequestError('Composição de mosaico inválida.');
      block.layout = value.layout;
    }
  }
  if (type === 'embed') block.src = embeddedVideo(value.src);
  if (type === 'video') {
    const src = mediaUrl(value.src);
    if (/\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(src)) block.src = src;
    else { block.src = embeddedVideo(src); block.type = 'embed'; }
  }
  return block;
}

export function normalizePortfolioProject(value, timestamp = new Date().toISOString()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Projeto inválido.');
  const id = text(value.id, 80) || randomBytes(16).toString('hex');
  const slug = text(value.slug, 100);
  const title = text(value.title, 160);
  if (!ID.test(id) || !SLUG.test(slug) || !title) throw new RequestError('Informe título, identificador e endereço válidos para o projeto.');
  const blocks = value.blocks ?? [];
  if (!Array.isArray(blocks) || blocks.length > 200) throw new RequestError('O projeto aceita até 200 blocos.');
  const normalizedBlocks = blocks.map(blockRecord);
  if (new Set(normalizedBlocks.map(block => block.id)).size !== normalizedBlocks.length) throw new RequestError('Cada bloco precisa de um identificador único.');
  const styles = value.styles ?? {};
  if (!styles || typeof styles !== 'object' || Array.isArray(styles)) throw new RequestError('Estilo inválido.');
  const background = text(styles.background, 9, '#ffffff');
  const width = styles.width ?? 1400; const spacing = styles.spacing ?? 0;
  if (!/^#[a-f0-9]{6}$/i.test(background) || !Number.isInteger(width) || width < 640 || width > 1800 || !Number.isInteger(spacing) || spacing < 0 || spacing > 160) throw new RequestError('Ajustes visuais inválidos.');
  const record = {
    id, slug, title, category: text(value.category, 100), description: text(value.description, 10000),
    cover: mediaUrl(value.cover, { optional: true }), coverAlt: text(value.coverAlt, 500),
    tags: list(value.tags), tools: list(value.tools), credits: text(value.credits, 5000),
    client: text(value.client, 200), year: text(value.year, 80),
    publication: enumeration(value.publication, ['draft', 'published'], 'draft'),
    status: enumeration(value.status, ['demo', 'placeholder', 'real'], 'real'), note: text(value.note, 5000),
    blocks: normalizedBlocks, styles: { background, spacing, width }, updatedAt: timestamp,
  };
  if (['demo', 'placeholder'].includes(record.status) && !record.note) throw new RequestError('Identifique estudos demonstrativos e espaços reservados com uma nota de contexto.');
  if (record.publication === 'published' && record.status !== 'placeholder' && (!record.cover || !record.category || !record.blocks.length)) throw new RequestError('Adicione uma capa, uma área criativa e ao menos um bloco de conteúdo antes de publicar.');
  return record;
}

function seedProjects(base) {
  const prefix = url => !url ? '' : /^https:\/\//i.test(url) || (base !== '/' && url.startsWith(base)) ? url : `${base}${url.replace(/^\//, '')}`;
  const prefixImage = image => ({ ...image, src: prefix(image.src), ...(image.responsiveSrc !== undefined ? { responsiveSrc: prefix(image.responsiveSrc) } : {}) });
  const prefixBlock = block => block.type === 'image' ? prefixImage(block) : block.type === 'grid' ? { ...block, images: block.images.map(prefixImage) } : { ...block };
  return originalProjects.map(project => normalizePortfolioProject({
    id: project.slug, slug: project.slug, title: project.title, category: project.category,
    description: project.description ?? project.intro, cover: prefix(project.cover ?? project.image), coverAlt: project.coverAlt ?? project.alt,
    tags: project.tags ?? project.services, tools: project.tools ?? [], credits: project.credits ?? '', client: project.client ?? '', year: project.year,
    publication: 'published', status: project.status === 'published' ? 'real' : project.status, note: project.note,
    blocks: Array.isArray(project.blocks) ? project.blocks.map(prefixBlock) : [
      { id: 'subtitle', type: 'text', text: project.subtitle, format: 'heading', align: 'left', size: 'normal' },
      { id: 'intro', type: 'text', text: project.intro, align: 'left', size: 'normal' },
      ...[['challenge', 'O desafio', project.challenge], ['concept', 'O conceito', project.concept], ['solution', 'A solução', project.solution]].filter(([, , value]) => value).flatMap(([id, heading, value]) => [
        { id: `${id}-heading`, type: 'text', text: heading, format: 'subheading', align: 'left', size: 'normal' },
        { id, type: 'text', text: value, align: 'left', size: 'normal' },
      ]),
      ...(project.gallery || []).map((image, index) => ({ id: `gallery-${index + 1}`, type: 'image', src: prefix(image.image), alt: image.alt, caption: image.caption || '' })),
      ...(project.deliverables.length ? [{ id: 'deliverables', type: 'text', text: `Entregas\n\n${project.deliverables.join(' · ')}` }] : []),
    ], styles: { background: '#171715', spacing: 24, width: 1400, ...project.styles },
  }, project.updatedAt || '2026-10-29T00:00:00.000Z'));
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new RequestError('Envie os dados no formato JSON.', 415);
  const length = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length < 0 || length > MAX_BODY) throw new RequestError('O arquivo excede o limite permitido.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('Dados ausentes.', 400);
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) { await reader.cancel(); throw new RequestError('O arquivo excede o limite permitido.', 413); }
      chunks.push(Buffer.from(value));
    }
  } catch (error) { if (error instanceof RequestError) throw error; throw new RequestError('Não foi possível ler os dados.', 400); }
  let result;
  try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError('JSON inválido.', 400); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new RequestError('Dados inválidos.', 400);
  return result;
}
function cookieValue(header, name) {
  const matches = (header || '').split(';').map(entry => entry.trim()).filter(entry => entry.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : '';
}
function uploadedImage(body) {
  const name = text(body.name, 200, 'imagem');
  if (typeof body.dataUrl !== 'string' || body.dataUrl.length > MAX_BODY) throw new RequestError('Imagem inválida.', 413);
  const match = body.dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) throw new RequestError('Envie uma imagem PNG, JPEG, WebP ou GIF. SVG não é permitido.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_UPLOAD) throw new RequestError('Cada imagem deve ter no máximo 3 MB.', 413);
  if (bytes.toString('base64') !== match[2]) throw new RequestError('Imagem inválida.');
  let mime;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0) mime = 'image/png';
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) mime = 'image/jpeg';
  else if (bytes.length >= 13 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) && bytes.readUInt16LE(6) > 0 && bytes.readUInt16LE(8) > 0) mime = 'image/gif';
  else if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16))) mime = 'image/webp';
  if (!mime || mime !== match[1]) throw new RequestError('O conteúdo da imagem não corresponde ao formato informado.');
  return { name, mime, data: bytes.toString('base64'), createdAt: new Date().toISOString() };
}

/** Standard Fetch handler shared by the local server and Vercel functions. */
export function createPortfolioAccess({ env = process.env, dataDir, base = '/', secureCookies = true, allowSetup = false } = {}) {
  base = `/${String(base).split('/').filter(Boolean).join('/')}${base === '/' ? '' : '/'}`;
  if (base === '//') base = '/';
  const endpoint = `${base}api/portfolio`;
  const store = createPortfolioStore({ env, dataDir, seed: seedProjects(base) });
  const sessionName = `${secureCookies ? '__Secure-' : ''}portfolio_access`;
  const attempts = new Map();
  const cookie = (value, seconds) => `${sessionName}=${value}; Path=${base}; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`;
  const setupAllowed = allowSetup && store.writable && !store.production && !store.cloud && !env.PORTFOLIO_ADMIN_PASSWORD && !env.PORTFOLIO_SESSION_SECRET;

  async function credentials() {
    if (env.PORTFOLIO_ADMIN_PASSWORD || env.PORTFOLIO_SESSION_SECRET) {
      if (typeof env.PORTFOLIO_ADMIN_PASSWORD !== 'string' || !env.PORTFOLIO_ADMIN_PASSWORD || typeof env.PORTFOLIO_SESSION_SECRET !== 'string' || env.PORTFOLIO_SESSION_SECRET.length < 32) return null;
      return { password: env.PORTFOLIO_ADMIN_PASSWORD, secret: env.PORTFOLIO_SESSION_SECRET };
    }
    const saved = await store.readLocalCredentials();
    if (!saved || !/^[a-f0-9]{32}$/.test(saved.salt) || !/^[a-f0-9]{128}$/.test(saved.hash) || typeof saved.secret !== 'string' || saved.secret.length < 32) return null;
    return saved;
  }

  return async function portfolioAccess(request) {
    const url = new URL(request.url); const method = request.method.toUpperCase();
    const json = (body, status = 200, extra = {}) => new Response(method === 'HEAD' ? null : JSON.stringify(body), { status, headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0',
      'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...extra,
    } });
    if (url.pathname !== endpoint && url.pathname !== `${endpoint}.js`) return json({ error: 'Página não encontrada.' }, 404);
    if (!['GET', 'HEAD', 'POST', 'PUT', 'DELETE'].includes(method)) return json({ error: 'Método não permitido.' }, 405, { Allow: 'GET, HEAD, POST, PUT, DELETE' });
    if (url.searchParams.getAll('action').length > 1 || url.searchParams.getAll('id').length > 1 || url.searchParams.getAll('slug').length > 1) return json({ error: 'Parâmetros inválidos.' }, 400);
    const action = url.searchParams.get('action') || 'session';
    const readOnly = method === 'GET' || method === 'HEAD';
    if (!readOnly && (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site')) return json({ error: 'Origem não permitida.' }, 403);
    try {
      const auth = await credentials();
      const now = Math.floor(Date.now() / 1000);
      const key = auth ? createHmac('sha256', auth.secret).update(`portfolio-v1\0${auth.password || auth.hash}`).digest() : null;
      const sign = value => createHmac('sha256', key).update(value).digest('base64url');
      const token = cookieValue(request.headers.get('cookie'), sessionName);
      let authenticated = false;
      if (key && /^\d{1,12}\.[\w-]{32}\.[\w-]{43}$/.test(token)) {
        const [expiry, nonce, signature] = token.split('.');
        authenticated = Number(expiry) > now && Number(expiry) <= now + SESSION_SECONDS && equal(signature, sign(`${expiry}.${nonce}`));
      }
      const loginResponse = () => {
        const payload = `${now + SESSION_SECONDS}.${randomBytes(24).toString('base64url')}`;
        return json({ authenticated: true }, 200, { 'Set-Cookie': cookie(`${payload}.${sign(payload)}`, SESSION_SECONDS) });
      };

      if (action === 'session' && readOnly) return json({ authenticated, setupRequired: Boolean(!auth && setupAllowed), configured: Boolean(auth), storageConfigured: store.writable });
      if (action === 'setup' && method === 'POST') {
        if (!setupAllowed || auth) return json({ error: 'A configuração inicial não está disponível.' }, 403);
        const body = await readJson(request); const password = passwordValue(body.password);
        if (password.length < 12) throw new RequestError('Escolha uma senha com pelo menos 12 caracteres.');
        const salt = randomBytes(16).toString('hex');
        const saved = { salt, hash: (await scrypt(password, salt, 64)).toString('hex'), secret: randomBytes(48).toString('base64url') };
        if (!await store.setupLocalCredentials(saved)) return json({ error: 'A senha já foi configurada.' }, 409);
        return json({ configured: true, authenticated: false, setupRequired: false }, 201);
      }
      if (action === 'login' && method === 'POST') {
        if (!auth) return json({ error: 'O acesso privado ainda não foi configurado.' }, 503);
        const client = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim().slice(0, 128);
        for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
        const attempt = attempts.get(client);
        if (attempt?.count >= 10) return json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, 429, { 'Retry-After': String(attempt.until - now) });
        const body = await readJson(request); const password = passwordValue(body.password);
        const valid = auth.password ? equal(createHmac('sha256', key).update(password).digest('hex'), createHmac('sha256', key).update(auth.password).digest('hex')) : equal((await scrypt(password, auth.salt, 64)).toString('hex'), auth.hash);
        if (!valid) {
          if (attempts.size >= 2048) attempts.delete(attempts.keys().next().value);
          attempts.set(client, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 900 });
          return json({ error: 'Senha incorreta.' }, 401);
        }
        attempts.delete(client); return loginResponse();
      }
      if (action === 'logout' && method === 'POST') return json({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
      if (action === 'public' && readOnly) {
        const published = (await store.read()).projects.filter(project => project.publication === 'published');
        const slug = url.searchParams.get('slug');
        if (slug !== null) {
          const project = published.find(item => item.slug === slug);
          return project ? json({ project }) : json({ error: 'Projeto não encontrado.' }, 404);
        }
        return json({ projects: published });
      }
      if (action === 'asset' && readOnly) {
        const id = url.searchParams.get('id') || '';
        if (!/^[a-f0-9]{32}$/.test(id)) return json({ error: 'Imagem não encontrada.' }, 404);
        const assetUrl = `${endpoint}?action=asset&id=${id}`;
        if (!authenticated) {
          const published = (await store.read()).projects.filter(project => project.publication === 'published');
          const referenced = published.some(project => project.cover === assetUrl || project.blocks.some(block => block.src === assetUrl || block.images?.some(image => image.src === assetUrl)));
          if (!referenced) return json({ error: 'Imagem não encontrada.' }, 404);
        }
        const asset = await store.readAsset(id);
        if (!asset) return json({ error: 'Imagem não encontrada.' }, 404);
        const bytes = Buffer.from(asset.data, 'base64');
        return new Response(method === 'HEAD' ? null : bytes, { headers: { 'Content-Type': asset.mime, 'Content-Length': String(bytes.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin' } });
      }
      if (!authenticated) return json({ error: auth ? 'Entre para acessar seus projetos.' : 'Configure o acesso privado para continuar.' }, auth ? 401 : 503);
      if (action === 'projects' && readOnly) return json({ projects: (await store.read()).projects });
      if (action === 'project' && method === 'PUT') {
        const record = normalizePortfolioProject(await readJson(request));
        const project = await store.mutate(state => {
          if (state.projects.some(item => item.id !== record.id && item.slug === record.slug)) throw new RequestError('Já existe um projeto com esse endereço.', 409);
          const index = state.projects.findIndex(item => item.id === record.id);
          if (index < 0) {
            if (state.projects.length >= 200) throw new RequestError('O portfólio aceita até 200 projetos.');
            state.projects.unshift(record);
          } else state.projects[index] = record;
          return record;
        });
        return json({ project });
      }
      if (action === 'project' && method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id || !ID.test(id)) throw new RequestError('Identificador inválido.');
        await store.mutate(state => {
          if (!state.projects.some(project => project.id === id)) throw new RequestError('Projeto não encontrado.', 404);
          state.projects = state.projects.filter(project => project.id !== id);
          return null;
        });
        return json({ deleted: true });
      }
      if (action === 'duplicate' && method === 'POST') {
        const id = url.searchParams.get('id');
        if (!id || !ID.test(id)) throw new RequestError('Identificador inválido.');
        const project = await store.mutate(state => {
          const source = state.projects.find(item => item.id === id);
          if (!source) throw new RequestError('Projeto não encontrado.', 404);
          if (state.projects.length >= 200) throw new RequestError('O portfólio aceita até 200 projetos.');
          const suffix = randomBytes(4).toString('hex');
          const duplicate = { ...structuredClone(source), id: randomBytes(16).toString('hex'), slug: `${source.slug.slice(0, 84)}-copia-${suffix}`, title: `${source.title.slice(0, 151)} (cópia)`, publication: 'draft', updatedAt: new Date().toISOString() };
          state.projects.splice(state.projects.indexOf(source) + 1, 0, duplicate);
          return duplicate;
        });
        return json({ project }, 201);
      }
      if (action === 'order' && method === 'PUT') {
        const { ids } = await readJson(request);
        if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== 'string' || !ID.test(id)) || new Set(ids).size !== ids.length) throw new RequestError('Ordem de projetos inválida.');
        const projects = await store.mutate(state => {
          const existing = new Map(state.projects.map(project => [project.id, project]));
          if (ids.length !== existing.size || ids.some(id => !existing.has(id))) throw new RequestError('A lista de projetos mudou. Atualize a página e tente novamente.', 409);
          state.projects = ids.map(id => existing.get(id));
          return state.projects;
        });
        return json({ projects });
      }
      if (action === 'upload' && method === 'POST') {
        if (!store.writable) throw new PortfolioStoreError('Configure o armazenamento remoto para enviar imagens nesta hospedagem.');
        const asset = uploadedImage(await readJson(request)); const id = randomBytes(16).toString('hex');
        await store.writeAsset(id, asset);
        return json({ url: `${endpoint}?action=asset&id=${id}` }, 201);
      }
      return json({ error: 'Ação ou método não permitido.' }, 405);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      if (error instanceof PortfolioStoreError) return json({ error: error.message }, 503);
      console.error('Não foi possível processar uma solicitação do portfólio.');
      return json({ error: 'Não foi possível concluir a solicitação. Tente novamente.' }, 500);
    }
  };
}

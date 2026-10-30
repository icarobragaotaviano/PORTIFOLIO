import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPortfolioAccess } from '../server/portfolio-access.js';
import { createPortfolioHome, createPortfolioPage } from '../server/portfolio-page.js';
import { createServer } from '../scripts/serve.mjs';
import { projects as originalProjects } from '../src/content.mjs';
import { escape } from '../src/templates.mjs';

const PASSWORD = 'fictional-portfolio-password';
const SECRET = 'fictional-portfolio-session-secret-longer-than-thirty-two';
const ORIGIN = 'https://portfolio.example.test';
const originalProject = originalProjects[0];
const directories = [];
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=';
after(async () => { await Promise.all(directories.map(path => rm(path, { recursive: true, force: true }))); });

async function harness(options = {}) {
  const dataDir = options.dataDir || await mkdtemp(join(tmpdir(), 'portfolio-api-'));
  if (!options.dataDir) directories.push(dataDir);
  const base = options.base || '/';
  const env = options.env || { PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: SECRET };
  const handler = createPortfolioAccess({ env, dataDir, secureCookies: false, ...options });
  const jar = new Map();
  async function call(action = 'session', { method = 'GET', body, headers = {}, anonymous = false, query = '', path } = {}) {
    const h = new Headers(headers);
    if (!['GET', 'HEAD'].includes(method) && !h.has('origin')) h.set('origin', ORIGIN);
    if (body !== undefined && !h.has('content-type')) h.set('content-type', 'application/json');
    if (!anonymous && jar.size && !h.has('cookie')) h.set('cookie', [...jar].map(([key, value]) => `${key}=${value}`).join('; '));
    const response = await handler(new Request(new URL(path || `${base}api/portfolio?action=${action}${query}`, ORIGIN), { method, headers: h, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }));
    assert.ok(response instanceof Response);
    assert.match(response.headers.get('cache-control'), /no-store/);
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';', 1)[0]; const index = pair.indexOf('=');
      const name = pair.slice(0, index); const value = pair.slice(index + 1);
      if (!value) jar.delete(name); else jar.set(name, value);
    }
    return response;
  }
  const login = (password = PASSWORD) => call('login', { method: 'POST', body: { password } });
  const save = project => call('project', { method: 'PUT', body: project });
  return { call, login, save, jar, dataDir, env, handler };
}
const project = (overrides = {}) => ({
  id: 'fixture-job', slug: 'fixture-job', title: 'Projeto real de teste', category: 'Branding',
  description: 'Descrição do projeto', cover: originalProject.image, coverAlt: 'Uma composição',
  tags: ['Design'], tools: ['Photoshop'], credits: 'Equipe de teste', client: 'Cliente de teste',
  year: '2026', publication: 'draft', status: 'real', note: '',
  blocks: [{ id: 'intro', type: 'text', format: 'heading', text: 'Uma história visual' }],
  styles: { background: '#f0f0f0', spacing: 24, width: 1400 }, ...overrides,
});

test('session is anonymous, seed remains honest, and private records require authentication', async () => {
  const h = await harness();
  const session = await h.call();
  assert.deepEqual(await session.json(), { authenticated: false, configured: true, setupRequired: false, storageConfigured: true });
  assert.equal((await h.call('projects')).status, 401);
  assert.equal((await h.save(project())).status, 401);
  const publicResponse = await h.call('public');
  const { projects } = await publicResponse.json();
  assert.equal(projects.length, originalProjects.length);
  assert.deepEqual(projects.map(item => item.slug), originalProjects.map(item => item.slug));
  for (const original of originalProjects) {
    const record = projects.find(item => item.slug === original.slug);
    assert.equal(record.title, original.title);
    assert.equal(record.status, original.status === 'published' ? 'real' : original.status);
    assert.equal(record.cover, original.cover ?? original.image);
    assert.equal(record.coverAlt, original.coverAlt ?? original.alt);
    assert.equal(record.description, original.description ?? original.intro);
    assert.equal(record.note, original.note);
    assert.deepEqual(record.tags, original.tags ?? original.services);
    if (Array.isArray(original.blocks)) {
      assert.deepEqual(record.blocks.map(block => block.id), original.blocks.map(block => block.id));
      assert.equal(record.client, original.client ?? '');
      assert.equal(record.credits, original.credits ?? '');
      for (const [key, value] of Object.entries(original.styles || {})) assert.equal(record.styles[key], value);
    }
    for (const entry of Array.isArray(original.blocks) ? [] : original.gallery || []) {
      assert.ok(record.blocks.some(block => block.type === 'image' && block.src === entry.image && block.alt === entry.alt), `Galeria original preservada: ${original.slug} / ${entry.image}`);
    }
  }
  assert.ok(projects.every(item => item.publication === 'published'));
  assert.equal(JSON.stringify(projects).includes(SECRET), false);
});

test('login issues a signed HttpOnly cookie, tampering and rotation invalidate it, and logout clears it', async () => {
  const h = await harness({ secureCookies: true });
  assert.equal((await h.login('wrong-password')).status, 401);
  const login = await h.login();
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { authenticated: true });
  const set = login.headers.getSetCookie()[0];
  assert.match(set, /^__Secure-portfolio_access=/);
  for (const pattern of [/HttpOnly/, /SameSite=Strict/, /; Secure/, /Max-Age=28800/]) assert.match(set, pattern);
  assert.equal(set.includes(PASSWORD), false);
  assert.equal((await h.call('projects')).status, 200);
  const valid = h.jar.get('__Secure-portfolio_access');
  h.jar.set('__Secure-portfolio_access', `${valid.slice(0, -1)}${valid.endsWith('A') ? 'B' : 'A'}`);
  assert.equal((await h.call('projects')).status, 401);
  h.jar.set('__Secure-portfolio_access', valid);
  h.env.PORTFOLIO_ADMIN_PASSWORD = `${PASSWORD}-rotated`;
  assert.equal((await h.call('projects')).status, 401);
  h.env.PORTFOLIO_ADMIN_PASSWORD = PASSWORD;
  assert.equal((await h.call('projects')).status, 200);
  const logout = await h.call('logout', { method: 'POST' });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.getSetCookie()[0], /Max-Age=0/);
  assert.equal((await h.call('projects')).status, 401);
});

test('same-origin protection rejects cross-site and missing-origin mutations without logging out', async () => {
  const h = await harness(); await h.login();
  for (const headers of [{ origin: 'https://hostile.example' }, { origin: 'null' }, { origin: ORIGIN, 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await h.call('project', { method: 'PUT', body: project(), headers })).status, 403);
    assert.equal((await h.call('logout', { method: 'POST', headers })).status, 403);
  }
  const handler = createPortfolioAccess({ env: h.env, dataDir: h.dataDir, secureCookies: false });
  const response = await handler(new Request(`${ORIGIN}/api/portfolio?action=login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) }));
  assert.equal(response.status, 403);
  assert.equal((await h.call('projects')).status, 200);
});

test('save persists across handler restarts, draft is private, and publishing exposes only published records', async () => {
  const h = await harness(); await h.login();
  const saved = await h.save(project({ updatedAt: '1900-01-01' }));
  assert.equal(saved.status, 200);
  const { project: record } = await saved.json();
  assert.notEqual(record.updatedAt, '1900-01-01');
  assert.equal(record.blocks[0].format, 'heading');
  assert.equal((await h.call('public', { query: '&slug=fixture-job' })).status, 404);
  const restarted = await harness({ dataDir: h.dataDir }); await restarted.login();
  const persisted = (await (await restarted.call('projects')).json()).projects.find(item => item.id === record.id);
  assert.equal(persisted.title, record.title);
  assert.equal((await restarted.save({ ...persisted, publication: 'published' })).status, 200);
  const published = await restarted.call('public', { anonymous: true, query: '&slug=fixture-job' });
  assert.equal(published.status, 200);
  assert.equal((await published.json()).project.title, record.title);
  await restarted.save({ ...persisted, publication: 'draft' });
  assert.equal((await restarted.call('public', { anonymous: true, query: '&slug=fixture-job' })).status, 404);
});

test('editor blocks, visual settings, tags, tools and credits survive publication and restart', async () => {
  const h = await harness(); await h.login();
  const blocks = [
    { id: 'text', type: 'text', format: 'heading', text: 'Narrativa visual do projeto', align: 'left', size: 'normal' },
    { id: 'photo', type: 'image', src: originalProject.image, alt: originalProject.alt, caption: 'Imagem com legenda', size: 'wide' },
    { id: 'grid', type: 'grid', images: originalProject.gallery.slice(0, 2).map(entry => ({ src: entry.image, alt: entry.alt })) },
    { id: 'video', type: 'embed', src: 'https://youtu.be/dQw4w9WgXcQ', caption: 'Filme do projeto' },
    { id: 'divider', type: 'divider' },
  ];
  const styles = { background: '#111110', width: 1280, spacing: 32 };
  const saved = await h.save(project({ publication: 'published', blocks, styles }));
  assert.equal(saved.status, 200);
  const { project: record } = await saved.json();
  const restarted = await harness({ dataDir: h.dataDir });
  const published = (await (await restarted.call('public', { query: '&slug=fixture-job', anonymous: true })).json()).project;
  assert.deepEqual(published.blocks, record.blocks);
  assert.deepEqual(published.styles, styles);
  assert.deepEqual(published.tags, ['Design']);
  assert.deepEqual(published.tools, ['Photoshop']);
  assert.equal(published.credits, 'Equipe de teste');
  const page = createPortfolioPage({ access: restarted.handler });
  const response = await page(new Request(`${ORIGIN}/projetos/fixture-job/`));
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const content of ['Narrativa visual do projeto', 'Imagem com legenda', 'Equipe de teste', 'Photoshop', 'Filme do projeto']) assert.ok(html.includes(content));
  for (const entry of originalProject.gallery.slice(0, 2)) assert.ok(html.includes(escape(entry.alt)));
  assert.match(html, /--pf-canvas-bg:#111110/);
  assert.match(html, /--pf-canvas-width:1280px/);
  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});

test('image dimensions, responsive sources and mosaic compositions survive editing and publication', async () => {
  const h = await harness(); await h.login();
  const image = { src: originalProject.image, alt: 'Imagem responsiva do projeto', width: 2704, height: 1670, responsiveSrc: '/images/work/wine-gourmet-marca.webp' };
  const blocks = [
    { id: 'image', type: 'image', ...image },
    ...['uniform', 'identity', 'triptych', 'campaign'].map(layout => ({ id: layout, type: 'grid', layout, images: [image, { src: image.src, alt: 'Sem dimensões opcionais' }] })),
  ];
  const saved = await h.save(project({ publication: 'published', blocks }));
  assert.equal(saved.status, 200);
  const { project: record } = await saved.json();
  assert.equal(record.blocks[0].width, image.width);
  assert.equal(record.blocks[0].height, image.height);
  assert.equal(record.blocks[0].responsiveSrc, image.responsiveSrc);
  for (const block of record.blocks.slice(1)) {
    assert.equal(block.layout, block.id);
    assert.deepEqual(block.images[0], image);
    assert.equal('width' in block.images[1], false);
    assert.equal('responsiveSrc' in block.images[1], false);
  }
  const restarted = await harness({ dataDir: h.dataDir });
  const published = (await (await restarted.call('public', { query: '&slug=fixture-job', anonymous: true })).json()).project;
  assert.deepEqual(published.blocks, record.blocks);
  for (const invalid of [
    { width: 0 }, { width: 1.5 }, { height: -1 }, { height: 100001 }, { responsiveSrc: 'javascript:alert(1)' },
  ]) {
    assert.equal((await h.save(project({ blocks: [{ id: 'image', type: 'image', ...image, ...invalid }] }))).status, 422);
    assert.equal((await h.save(project({ blocks: [{ id: 'grid', type: 'grid', images: [{ ...image, ...invalid }] }] }))).status, 422);
  }
  for (const layout of ['unknown', 'identity" onclick="alert(1)', '', null]) {
    assert.equal((await h.save(project({ blocks: [{ id: 'grid', type: 'grid', layout, images: [image] }] }))).status, 422);
  }
});

test('duplicate creates an independent draft, reorder is complete and atomic, and delete persists', async () => {
  const h = await harness(); await h.login(); await h.save(project({ publication: 'published' }));
  const duplicated = await h.call('duplicate', { method: 'POST', query: '&id=fixture-job' });
  assert.equal(duplicated.status, 201);
  const copy = (await duplicated.json()).project;
  assert.notEqual(copy.id, 'fixture-job'); assert.notEqual(copy.slug, 'fixture-job');
  assert.equal(copy.publication, 'draft');
  let records = (await (await h.call('projects')).json()).projects;
  const ids = records.map(item => item.id).reverse();
  assert.equal((await h.call('order', { method: 'PUT', body: { ids: ids.slice(1) } })).status, 409);
  assert.equal((await h.call('order', { method: 'PUT', body: { ids: [ids[0], ...ids.slice(0, -1)] } })).status, 422);
  assert.equal((await h.call('order', { method: 'PUT', body: { ids } })).status, 200);
  records = (await (await h.call('projects')).json()).projects;
  assert.deepEqual(records.map(item => item.id), ids);
  assert.equal((await h.call('project', { method: 'DELETE', query: `&id=${copy.id}` })).status, 200);
  assert.equal((await h.call('project', { method: 'DELETE', query: `&id=${copy.id}` })).status, 404);
  assert.equal((await h.call('public', { anonymous: true, query: `&slug=${copy.slug}` })).status, 404);
});

test('uploads validate bytes and uploaded assets follow draft/publication privacy', async () => {
  const h = await harness(); await h.login();
  const uploaded = await h.call('upload', { method: 'POST', body: { name: 'teste.png', dataUrl: `data:image/png;base64,${PNG}` } });
  assert.equal(uploaded.status, 201);
  const { url } = await uploaded.json();
  assert.match(url, /^\/api\/portfolio\?action=asset&id=[a-f0-9]{32}$/);
  assert.equal((await h.call('asset', { path: url, anonymous: true })).status, 404);
  const authorized = await h.call('asset', { path: url });
  assert.equal(authorized.status, 200);
  assert.equal(authorized.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await authorized.arrayBuffer()), Buffer.from(PNG, 'base64'));
  await h.save(project({ cover: url }));
  assert.equal((await h.call('asset', { path: url, anonymous: true })).status, 404);
  await h.save(project({ cover: url, publication: 'published' }));
  assert.equal((await h.call('asset', { path: url, anonymous: true })).status, 200);
  await h.save(project({ cover: url, publication: 'draft' }));
  assert.equal((await h.call('asset', { path: url, anonymous: true })).status, 404);
  for (const dataUrl of ['data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+', 'data:image/png;base64,aGVsbG8=', `data:image/jpeg;base64,${PNG}`]) {
    assert.equal((await h.call('upload', { method: 'POST', body: { name: 'bad', dataUrl } })).status, 422);
  }
});

test('invalid schema, active URLs, unsupported embeds and slug collisions cannot overwrite good data', async () => {
  const h = await harness(); await h.login(); await h.save(project());
  const invalid = [
    { title: '' }, { slug: '../private' }, { cover: 'javascript:alert(1)' }, { cover: '//evil.example/image.png' },
    { cover: 'data:image/png;base64,AA==' }, { styles: { background: 'url(javascript:alert(1))', spacing: 0, width: 1400 } },
    { blocks: [{ id: 'embed', type: 'embed', src: 'https://evil.example/frame' }] },
    { blocks: [{ id: 'x', type: 'text', text: 'A' }, { id: 'x', type: 'text', text: 'B' }] },
    { blocks: [{ id: 'x', type: 'unknown' }] },
  ];
  for (const value of invalid) assert.equal((await h.save(project(value))).status, 422);
  assert.equal((await h.save(project({ id: 'another-project' }))).status, 409);
  const records = (await (await h.call('projects')).json()).projects;
  assert.equal(records.find(item => item.id === 'fixture-job').title, 'Projeto real de teste');
  const embed = await h.save(project({ blocks: [{ id: 'video', type: 'embed', src: 'https://youtu.be/dQw4w9WgXcQ' }] }));
  assert.equal(embed.status, 200);
  assert.equal((await embed.json()).project.blocks[0].src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  const video = await h.save(project({ blocks: [{ id: 'video', type: 'video', src: 'https://youtube.com/shorts/dQw4w9WgXcQ' }] }));
  assert.equal(video.status, 200);
  assert.equal((await video.json()).project.blocks[0].type, 'embed');
  for (const value of [{ cover: '' }, { category: '' }, { blocks: [] }]) assert.equal((await h.save(project({ ...value, publication: 'published' }))).status, 422);
  assert.equal((await h.save(project({ status: 'demo', note: '' }))).status, 422);
});

test('project HTML checks current publication for normal, explicit index and rewritten API URLs', async () => {
  const h = await harness(); const page = createPortfolioPage({ access: h.handler });
  const request = (path, method = 'GET') => page(new Request(new URL(path, ORIGIN), { method }));
  const initial = await request(`/projetos/${originalProject.slug}/`);
  assert.equal(initial.status, 200); assert.ok((await initial.text()).includes(escape(originalProject.title)));
  assert.match(initial.headers.get('cache-control'), /no-store/);
  await h.login(); await h.save(project());
  const paths = ['/projetos/fixture-job/', '/projetos/fixture-job/index.html', '/api/portfolio?action=page&slug=fixture-job'];
  for (const path of paths) assert.equal((await request(path)).status, 404);
  await h.save(project({ publication: 'published' }));
  for (const path of paths) {
    const response = await request(path);
    assert.equal(response.status, 200); assert.match(await response.text(), /Projeto real de teste/);
  }
  const head = await request(paths[0], 'HEAD'); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  await h.save(project({ publication: 'draft' }));
  for (const path of paths) assert.equal((await request(path)).status, 404);
  const original = (await (await h.call('projects')).json()).projects.find(item => item.slug === originalProject.slug);
  await h.save({ ...original, publication: 'draft' });
  assert.equal((await request(`/projetos/${original.slug}/index.html`)).status, 404);
  assert.equal((await request(`/projetos/${original.slug}/`)).status, 404);
  await h.call('project', { method: 'DELETE', query: `&id=${original.id}` });
  assert.equal((await request(`/api/portfolio?action=page&slug=${original.slug}`)).status, 404);
  const unavailable = createPortfolioPage({ access: async () => Response.json({ error: 'unavailable' }, { status: 503 }) });
  assert.equal((await unavailable(new Request(`${ORIGIN}/projetos/${originalProject.slug}/`))).status, 404);
});

test('homepage HTML shows current published projects and never reintroduces drafts or deleted seed data', async () => {
  const h = await harness(); const home = createPortfolioHome({ access: h.handler });
  const request = (path = '/', method = 'GET') => home(new Request(new URL(path, ORIGIN), { method }));
  assert.ok((await (await request()).text()).includes(`href="/projetos/${originalProject.slug}/"`));
  await h.login();
  const unique = project({ title: 'HOME_PUBLICATION_FIXTURE', slug: 'home-publication-fixture' });
  await h.save(unique);
  for (const path of ['/', '/index.html', '/api/portfolio?action=home']) assert.doesNotMatch(await (await request(path)).text(), /HOME_PUBLICATION_FIXTURE/);
  await h.save({ ...unique, publication: 'published' });
  for (const path of ['/', '/index.html', '/api/portfolio?action=home']) {
    const response = await request(path);
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
    assert.match(await response.text(), /HOME_PUBLICATION_FIXTURE/);
  }
  const head = await request('/', 'HEAD'); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  await h.save(unique);
  assert.doesNotMatch(await (await request()).text(), /HOME_PUBLICATION_FIXTURE/);
  const projects = (await (await h.call('projects')).json()).projects;
  for (const item of projects) await h.call('project', { method: 'DELETE', query: `&id=${item.id}` });
  const empty = await (await request()).text();
  for (const slug of [...originalProjects.map(item => item.slug), unique.slug]) assert.ok(!empty.includes(`href="/projetos/${slug}/"`), `Projeto removido não retorna: ${slug}`);
  assert.match(empty, /0 projetos/);
  const unavailable = createPortfolioHome({ access: async () => Response.json({ error: 'unavailable' }, { status: 503 }) });
  const failed = await unavailable(new Request(`${ORIGIN}/`));
  assert.equal(failed.status, 503);
  const failedHtml = await failed.text();
  assert.doesNotMatch(failedHtml, /data-portfolio-gallery/);
  for (const item of originalProjects) assert.ok(!failedHtml.includes(escape(item.title)));
});

test('first-run setup is explicit, salted, survives restart, and cannot replace an existing password', async () => {
  const h = await harness({ env: {}, allowSetup: true });
  assert.equal((await (await h.call()).json()).setupRequired, true);
  assert.equal((await h.call('setup', { method: 'POST', body: { password: 'short' } })).status, 422);
  assert.equal((await h.call('setup', { method: 'POST', body: { password: PASSWORD } })).status, 201);
  const config = JSON.parse(await readFile(join(h.dataDir, 'credentials.json'), 'utf8'));
  assert.match(config.salt, /^[a-f0-9]{32}$/); assert.match(config.hash, /^[a-f0-9]{128}$/);
  assert.equal(JSON.stringify(config).includes(PASSWORD), false);
  assert.equal((await h.call('setup', { method: 'POST', body: { password: `${PASSWORD}-changed` } })).status, 403);
  assert.equal((await h.login()).status, 200);
  const restarted = await harness({ dataDir: h.dataDir, env: {}, allowSetup: true });
  assert.equal((await restarted.login()).status, 200);
  const disabled = await harness({ env: {} });
  assert.equal((await disabled.call('setup', { method: 'POST', body: { password: PASSWORD } })).status, 403);
  assert.equal((await disabled.call()).status, 200);
  assert.equal((await disabled.call('login', { method: 'POST', body: { password: PASSWORD } })).status, 503);
});

test('remote deployments without durable storage fail closed for writes and do not offer local setup', async () => {
  const env = { VERCEL: '1', PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: SECRET };
  const h = await harness({ env, allowSetup: true }); await h.login();
  assert.equal((await (await h.call()).json()).storageConfigured, false);
  assert.equal((await h.call('public')).status, 200);
  assert.equal((await h.save(project())).status, 503);
  assert.equal((await h.call('upload', { method: 'POST', body: { name: 'a.png', dataUrl: `data:image/png;base64,${PNG}` } })).status, 503);
  const unconfigured = await harness({ env: { VERCEL: '1' }, allowSetup: true });
  const session = await (await unconfigured.call()).json();
  assert.equal(session.setupRequired, false); assert.equal(session.configured, false);
  assert.equal((await unconfigured.call('setup', { method: 'POST', body: { password: PASSWORD } })).status, 403);
});

test('deployed Upstash storage persists projects and assets across isolated handlers', async () => {
  const previous = globalThis.fetch; const values = new Map();
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://redis.example.test/');
    assert.equal(options.headers.Authorization, 'Bearer fictional-token');
    const [command, ...args] = JSON.parse(options.body); let result;
    if (command === 'GET') result = values.get(args[0]) ?? null;
    else if (command === 'SET') { values.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'EVAL') {
      const [, , key, expected, next] = args;
      if ((values.get(key) ?? '__MISSING__') === expected) { values.set(key, next); result = 1; } else result = 0;
    } else throw new Error('Unexpected Redis command');
    return Response.json({ result });
  };
  try {
    const env = { VERCEL: '1', PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: SECRET, UPSTASH_REDIS_REST_URL: 'https://redis.example.test', UPSTASH_REDIS_REST_TOKEN: 'fictional-token' };
    const first = await harness({ env }); await first.login();
    assert.equal((await first.save(project({ publication: 'published' }))).status, 200);
    const uploaded = await first.call('upload', { method: 'POST', body: { name: 'a.png', dataUrl: `data:image/png;base64,${PNG}` } });
    const { url } = await uploaded.json();
    await first.save(project({ publication: 'published', cover: url }));
    const second = await harness({ env });
    assert.equal((await second.call('public', { query: '&slug=fixture-job' })).status, 200);
    assert.equal((await second.call('asset', { path: url })).status, 200);
    assert.equal((await second.call('projects')).status, 401);
  } finally { globalThis.fetch = previous; }
});

test('bad credentials, throttling, malformed JSON, body limits and alternate bases behave predictably', async () => {
  const h = await harness({ base: '/portfolio/' });
  assert.equal((await h.call('public', { path: '/api/portfolio?action=public' })).status, 404);
  for (let index = 0; index < 10; index += 1) assert.equal((await h.login('incorrect')).status, 401);
  assert.equal((await h.login()).status, 429);
  const other = await harness({ base: '/portfolio/' }); await other.login();
  const bad = await other.call('project', { method: 'PUT', body: '{broken' });
  assert.equal(bad.status, 400);
  assert.equal((await other.call('project', { method: 'PUT', body: '{}', headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await other.call('project', { method: 'PUT', body: '{}', headers: { 'content-length': '5000000' } })).status, 413);
  const seed = (await (await other.call('public')).json()).projects;
  for (const original of originalProjects) {
    const record = seed.find(item => item.slug === original.slug);
    assert.equal(record.cover, `/portfolio${original.cover ?? original.image}`);
    if (Array.isArray(original.blocks)) {
      for (const sourceBlock of original.blocks) {
        const saved = record.blocks.find(block => block.id === sourceBlock.id);
        const imagePairs = sourceBlock.type === 'image' ? [[sourceBlock, saved]] : sourceBlock.type === 'grid' ? sourceBlock.images.map((image, index) => [image, saved.images[index]]) : [];
        for (const [source, image] of imagePairs) {
          assert.equal(image.src, source.src.startsWith('/') ? `/portfolio${source.src}` : source.src);
          if (source.responsiveSrc) assert.equal(image.responsiveSrc, source.responsiveSrc.startsWith('/') ? `/portfolio${source.responsiveSrc}` : source.responsiveSrc);
          for (const key of ['width', 'height']) if (source[key] !== undefined) assert.equal(image[key], source[key]);
        }
      }
    } else for (const entry of original.gallery || []) assert.ok(record.blocks.some(block => block.src === `/portfolio${entry.image}`));
  }
  const uploaded = await other.call('upload', { method: 'POST', body: { name: 'a.png', dataUrl: `data:image/png;base64,${PNG}` } });
  assert.match((await uploaded.json()).url, /^\/portfolio\/api\/portfolio/);
  const weak = await harness({ env: { PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: 'weak' } });
  assert.equal((await weak.login()).status, 503);
  const head = await other.call('public', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
});

// Exercise the real Node HTTP adapter while avoiding a network listener.
async function localHttp(server, path, { method = 'GET', body, headers: inputHeaders = {} } = {}) {
  const incoming = body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
  const headers = { host: 'portfolio.example.test', ...inputHeaders };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const output = { status: 0, headers: {}, body: undefined };
  const response = {
    setHeader(name, value) { output.headers[name.toLowerCase()] = value; },
    writeHead(status, values = {}) { output.status = status; for (const [name, value] of Object.entries(values)) this.setHeader(name, value); },
    end(value) { output.body = value === undefined ? Buffer.alloc(0) : Buffer.from(value); },
  };
  await server.listeners('request')[0]({ url: path, method, headers, async *[Symbol.asyncIterator]() { if (incoming.length) yield incoming; } }, response);
  assert.ok(output.body !== undefined, `HTTP response completes: ${method} ${path}`);
  return output;
}

for (const base of ['/', '/portfolio/']) {
  test(`real HTTP bridge ${base}: auth, persisted drafts, uploads, publication and stale HTML protection`, async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'portfolio-http-')); directories.push(scratch);
    const publicRoot = join(scratch, 'public'); const dataDir = join(scratch, 'data');
    await mkdir(join(publicRoot, 'projetos', 'fixture-job'), { recursive: true });
    await mkdir(join(publicRoot, 'projetos', originalProject.slug), { recursive: true });
    await Promise.all([
      writeFile(join(publicRoot, 'index.html'), 'STALE_HOME_PROJECT_HTML'),
      writeFile(join(publicRoot, '404.html'), '<!doctype html><meta name="robots" content="noindex"><h1>Fixture 404</h1>'),
      writeFile(join(publicRoot, 'projetos', 'fixture-job', 'index.html'), 'STALE_PRIVATE_PROJECT_HTML'),
      writeFile(join(publicRoot, 'projetos', originalProject.slug, 'index.html'), 'STALE_SEEDED_PROJECT_HTML'),
    ]);
    const server = createServer(publicRoot, { base, portfolioDataDir: dataDir, portfolioEnv: { PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: SECRET } });
    let cookie = '';
    const call = (action, { anonymous = false, headers = {}, query = '', ...options } = {}) => localHttp(server, `${base}api/portfolio?action=${action}${query}`, { ...options, headers: { origin: 'http://portfolio.example.test', ...(!anonymous && cookie ? { cookie } : {}), ...headers } });
    assert.equal((await call('projects')).status, 401);
    const login = await call('login', { method: 'POST', body: { password: PASSWORD } });
    assert.equal(login.status, 200);
    assert.ok(Array.isArray(login.headers['set-cookie']), 'HTTP adapter forwards a Set-Cookie array');
    const sessionCookie = login.headers['set-cookie'][0];
    assert.match(sessionCookie, /HttpOnly/); assert.ok(sessionCookie.includes(`Path=${base};`));
    cookie = sessionCookie.split(';', 1)[0];
    assert.equal(JSON.parse((await call('session')).body).authenticated, true);
    assert.equal((await call('projects')).status, 200);
    assert.equal((await call('project', { method: 'PUT', body: project(), headers: { origin: 'https://untrusted.example' } })).status, 403);
    assert.equal((await call('project', { method: 'PUT', body: project() })).status, 200);
    assert.equal(JSON.parse((await call('public', { anonymous: true })).body).projects.some(item => item.id === 'fixture-job'), false);
    const homePaths = [base, `${base}index.html`, `${base}api/portfolio?action=home`];
    for (const path of homePaths) {
      const response = await localHttp(server, path);
      assert.equal(response.status, 200); assert.doesNotMatch(response.body.toString(), /STALE_HOME_PROJECT_HTML|href="[^\"]*\/projetos\/fixture-job\/"/);
    }
    const pagePaths = [`${base}projetos/fixture-job/`, `${base}projetos/fixture-job/index.html`, `${base}api/portfolio?action=page&slug=fixture-job`];
    for (const path of pagePaths) {
      const response = await localHttp(server, path);
      assert.equal(response.status, 404); assert.doesNotMatch(response.body.toString(), /STALE_PRIVATE_PROJECT_HTML/);
      assert.match(response.headers['cache-control'], /no-store/);
    }
    const upload = await call('upload', { method: 'POST', body: { name: 'fixture.png', dataUrl: `data:image/png;base64,${PNG}` } });
    assert.equal(upload.status, 201); assert.match(upload.headers['content-type'], /application\/json/);
    const { url } = JSON.parse(upload.body);
    assert.ok(url.startsWith(`${base}api/portfolio?`));
    assert.equal((await localHttp(server, url)).status, 404);
    const privateImage = await localHttp(server, url, { headers: { cookie } });
    assert.equal(privateImage.status, 200); assert.equal(privateImage.headers['content-type'], 'image/png');
    assert.deepEqual(privateImage.body, Buffer.from(PNG, 'base64'));
    assert.equal((await call('project', { method: 'PUT', body: project({ publication: 'published', cover: url }) })).status, 200);
    for (const path of homePaths) assert.ok((await localHttp(server, path)).body.toString().includes(`href="${base}projetos/fixture-job/"`));
    assert.equal(JSON.parse((await call('public', { anonymous: true, query: '&slug=fixture-job' })).body).project.id, 'fixture-job');
    for (const path of pagePaths) {
      const response = await localHttp(server, path);
      assert.equal(response.status, 200); assert.match(response.headers['content-type'], /text\/html/);
      assert.match(response.body.toString(), /Projeto real de teste/); assert.doesNotMatch(response.body.toString(), /STALE_PRIVATE_PROJECT_HTML/);
    }
    assert.equal((await localHttp(server, pagePaths[0], { method: 'HEAD' })).body.length, 0);
    const publicImage = await localHttp(server, url);
    assert.equal(publicImage.status, 200); assert.equal(publicImage.headers['content-type'], 'image/png');
    assert.equal((await call('project', { method: 'PUT', body: project({ cover: url }) })).status, 200);
    for (const path of homePaths) assert.equal((await localHttp(server, path)).body.toString().includes(`href="${base}projetos/fixture-job/"`), false);
    for (const path of pagePaths) assert.equal((await localHttp(server, path)).status, 404);
    assert.equal((await localHttp(server, url)).status, 404, 'unpublishing also hides the referenced image');
    const seeded = JSON.parse((await call('projects')).body).projects.find(item => item.slug === originalProject.slug);
    await call('project', { method: 'PUT', body: { ...seeded, publication: 'draft' } });
    for (const path of [`${base}projetos/${seeded.slug}/`, `${base}projetos/${seeded.slug}/index.html`]) {
      const response = await localHttp(server, path);
      assert.equal(response.status, 404); assert.doesNotMatch(response.body.toString(), /STALE_SEEDED_PROJECT_HTML/);
    }
    const restarted = createServer(publicRoot, { base, portfolioDataDir: dataDir, portfolioEnv: { PORTFOLIO_ADMIN_PASSWORD: PASSWORD, PORTFOLIO_SESSION_SECRET: SECRET } });
    assert.equal((await localHttp(restarted, `${base}projetos/${seeded.slug}/index.html`)).status, 404, 'restart preserves the unpublished state');
    const logout = await call('logout', { method: 'POST', body: {} });
    assert.equal(logout.status, 200); assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
    server.close(); restarted.close();
  });
}

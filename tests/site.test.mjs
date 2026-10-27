import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, root } from '../scripts/build.mjs';
import { createServer } from '../scripts/serve.mjs';
import { escape, normalizeBase, casePage } from '../src/templates.mjs';
import { projects } from '../src/content.mjs';

let scratch;
const builds = new Map();

before(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'portifolio-tests-'));
  for (const [name, base] of [['root', '/'], ['pages', '/PORTIFOLIO/']]) {
    const result = await build({ outDir: join(scratch, name), base });
    builds.set(base, result);
  }
});

after(async () => {
  if (scratch) await rm(scratch, { recursive: true, force: true });
});

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

function decodeAttribute(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

for (const base of ['/', '/PORTIFOLIO/']) {
  test(`build ${base}: todas as páginas, links, imagens e âncoras locais existem`, async () => {
    const { outDir, pages } = builds.get(base);
    const files = await htmlFiles(outDir);
    assert.equal(pages, projects.length + 3);
    assert.equal(files.length, projects.length + 3);
    assert.ok((await stat(join(outDir, '.nojekyll'))).isFile());
    const htmlCache = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));

    for (const [file, html] of htmlCache) {
      assert.match(html, /<html lang="pt-BR">/);
      assert.match(html, /<meta name="viewport"/);
      const relativePage = file.slice(outDir.length + 1).replace(/index\.html$/, '');
      const currentUrl = new URL(`${base}${relativePage}`, 'https://portfolio.test');
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      assert.equal(new Set(ids).size, ids.length, `IDs duplicados em ${relativePage || '/'}`);

      for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
        const href = decodeAttribute(match[1]);
        const target = new URL(href, currentUrl);
        if (target.origin !== currentUrl.origin) continue;
        assert.ok(target.pathname.startsWith(base), `Link fora da base ${base}: ${href}`);
        let targetFile = resolve(outDir, decodeURIComponent(target.pathname.slice(base.length)));
        assert.ok(targetFile === outDir || targetFile.startsWith(`${outDir}/`), `Link fora da saída: ${href}`);
        if ((await stat(targetFile)).isDirectory()) targetFile = join(targetFile, 'index.html');
        assert.ok((await stat(targetFile)).isFile(), `Destino ausente: ${href} em ${file}`);
        if (target.hash) {
          const targetHtml = htmlCache.get(targetFile) ?? await readFile(targetFile, 'utf8');
          const targetIds = [...targetHtml.matchAll(/\bid="([^"]+)"/g)].map((item) => item[1]);
          assert.ok(targetIds.includes(decodeURIComponent(target.hash.slice(1))), `Âncora ausente: ${href} em ${file}`);
        }
      }
    }
  });

  test(`build ${base}: trabalhos reais e créditos são preservados`, async () => {
    const { outDir } = builds.get(base);
    assert.ok(projects.length >= 3);
    for (const project of projects) {
      const html = await readFile(join(outDir, 'projetos', project.slug, 'index.html'), 'utf8');
      assert.ok(html.includes(escape(project.title)));
      if (project.note) assert.ok(html.includes(escape(project.note)), `Crédito ausente: ${project.slug}`);
      for (const entry of project.gallery || []) assert.ok(html.includes(escape(entry.alt)));
    }
  });

  test(`build ${base}: quatro áreas principais e acesso separado ao painel`, async () => {
    const { outDir } = builds.get(base);
    const html = await readFile(join(outDir, 'index.html'), 'utf8');
    for (const sectionId of ['projetos', 'sobre', 'experiencia', 'contato']) {
      assert.match(html, new RegExp(`id="${sectionId}"`), `Seção #${sectionId} ausente`);
    }
    for (const value of ['Ícaro Braga', 'icarobragaotaviano@gmail.com', 'Bolero Comunicação', 'Colégio Paiva Andrade']) assert.ok(html.includes(value));
    assert.ok(html.includes(`${base}admin/`));
    assert.doesNotMatch(html, /data-edit-img|owner-access-btn|site-overrides/);
    const admin = await readFile(join(outDir, 'admin/index.html'), 'utf8');
    assert.match(admin, /name="robots" content="noindex/);
    assert.ok(admin.includes(`${base}admin.js`));
    assert.doesNotMatch(admin, /fonts\.googleapis|app\.js/);
  });

}

test('texto editável é escapado tanto em conteúdo quanto em atributos HTML', () => {
  const input = '<script>alert("x" & \'y\')</script>';
  const escaped = '&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;';
  assert.equal(escape(input), escaped);
  assert.equal(escape(), '');
  const html = casePage({ ...projects[0], title: input, intro: input, alt: input, note: input }, '/');
  assert.ok(html.includes(`<h1>${escaped}`));
  assert.ok(html.includes(`alt="${escaped}"`));
  assert.ok(html.includes(`content="${escaped}"`));
  assert.ok(!html.includes(input));
});

test('caminho base rejeita travessia, URLs externas e caracteres de HTML', () => {
  for (const base of ['/', '/PORTIFOLIO/', '/a/b-c_d/']) assert.equal(normalizeBase(base), base);
  for (const base of ['', 'PORTIFOLIO', '/PORTIFOLIO', '//', '../', '/a/../', '/%2e%2e/', 'https://example.com/', '/"/><script>/']) {
    assert.throws(() => normalizeBase(base), /BASE_PATH/, `Base deveria ser recusada: ${base}`);
  }
});

test('build recusa saídas que substituiriam fontes ou a raiz do projeto', async () => {
  for (const outDir of [root, resolve(root, '..'), ...['src', 'public', 'scripts', 'tests', '.git'].map((part) => join(root, part))]) {
    await assert.rejects(build({ outDir }), /arquivos-fonte/);
  }
  assert.ok((await stat(join(root, 'src', 'content.mjs'))).isFile());
});

// Exercise the real HTTP request handler without opening a network port.
// This also runs in environments where localhost listen is restricted.
async function request(server, url, method = 'GET') {
  const headers = {};
  let status;
  let body;
  const response = {
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    writeHead(code, values = {}) {
      status = code;
      for (const [name, value] of Object.entries(values)) this.setHeader(name, value);
    },
    end(value) { body = value === undefined ? Buffer.alloc(0) : Buffer.from(value); },
  };
  await server.listeners('request')[0]({ url, method }, response);
  assert.ok(body !== undefined, `Resposta não foi encerrada: ${method} ${url}`);
  return { status, headers, body };
}

for (const base of ['/', '/PORTIFOLIO/']) {
  test(`servidor ${base}: GET, HEAD, recursos, 404, métodos e redirecionamento`, async () => {
    const server = createServer(builds.get(base).outDir, { base });
    const get = await request(server, base);
    assert.equal(get.status, 200);
    assert.match(get.headers['content-type'], /^text\/html/);
    assert.equal(get.headers['content-length'], get.body.length);
    assert.equal(get.headers['x-content-type-options'], 'nosniff');

    const head = await request(server, base, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(head.headers['content-length'], get.body.length);

    for (const [path, type] of [['styles.css', /^text\/css/], ['app.js', /^text\/javascript/], ['admin.js', /^text\/javascript/]]) {
      const asset = await request(server, `${base}${path}`);
      assert.equal(asset.status, 200);
      assert.match(asset.headers['content-type'], type);
      assert.ok(asset.body.length > 0);
    }

    const missing = await request(server, `${base}pagina-inexistente/`);
    assert.equal(missing.status, 404);
    assert.match(missing.body.toString(), /name="robots" content="noindex"/);
    assert.equal((await request(server, `${base}pagina-inexistente/`, 'HEAD')).body.length, 0);

    const post = await request(server, base, 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');

    const redirect = await request(server, `${base}projetos/${projects[0].slug}?origem=teste`);
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.location, `${base}projetos/${projects[0].slug}/?origem=teste`);
    assert.equal(redirect.body.length, 0);
    assert.equal((await request(server, redirect.headers.location)).status, 200);
    if (base !== '/') assert.equal((await request(server, '/')).status, 404);
  });

  test(`servidor ${base}: caminhos malformados e arquivos privados são recusados`, async () => {
    const server = createServer(builds.get(base).outDir, { base });
    for (const path of ['.git/config', '.env', '..%2fpackage.json', 'projetos/%5c..%5cpackage.json', 'x%00.html']) {
      assert.equal((await request(server, `${base}${path}`)).status, 403, path);
    }
    for (const path of ['%', '%E0%A4%A', '%GG']) {
      assert.equal((await request(server, `${base}${path}`)).status, 400, path);
    }
  });
}

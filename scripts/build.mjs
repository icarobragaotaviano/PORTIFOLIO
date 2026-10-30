import { cp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/content.mjs';
import { home, casePage, layout, normalizeBase } from '../src/templates.mjs';
import { studioPage } from '../src/studio-template.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function validateProjectImages(inputs = projects) {
  const imageSources = image => [image.src, image.responsiveSrc];
  const publicDirectory = resolve(root, 'public');
  for (const project of inputs) {
    const blockSources = (project.blocks || []).flatMap(block => block.type === 'image' ? imageSources(block) : block.type === 'grid' ? (block.images || []).flatMap(imageSources) : []);
    for (const image of new Set([project.image, project.cover, ...(project.gallery || []).map(entry => entry.image), ...blockSources].filter(Boolean))) {
      if (/^https:\/\//i.test(image)) continue;
      const file = resolve(publicDirectory, image.replace(/^\//, ''));
      if (!image.startsWith('/') || !file.startsWith(`${publicDirectory}/`) || !(await stat(file).catch(() => null))?.isFile()) throw new Error(`Imagem ausente: ${image}`);
    }
  }
}

export async function build({ outDir = resolve(root, 'dist'), base = '/' } = {}) {
  base = normalizeBase(base);
  // Never permit a custom output to replace project sources or their parents.
  const destination = resolve(outDir);
  if (root === destination || root.startsWith(`${destination}/`) || (destination.startsWith(`${root}/`) && destination !== resolve(root, 'dist'))) {
    throw new Error('Diretório de saída não pode substituir arquivos-fonte.');
  }
  // Check uploads before clearing the last successful build.
  await validateProjectImages();
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  const retired = new Set(['admin.js', 'admin.css', 'github-cms.js'].map(name => resolve(root, 'public', name)));
  const separateGames = resolve(root, 'public/jogos');
  await cp(resolve(root, 'public'), destination, { recursive: true, filter: source => !retired.has(resolve(source)) && resolve(source) !== separateGames });
  await writeFile(resolve(destination, 'index.html'), home(base));
  await mkdir(resolve(destination, 'admin'), { recursive: true });
  await writeFile(resolve(destination, 'admin', 'index.html'), studioPage(base));
  await mkdir(resolve(destination, 'studio'), { recursive: true });
  await writeFile(resolve(destination, 'studio', 'index.html'), studioPage(base));
  for (const project of projects) {
    if (!/^[a-z0-9-]+$/.test(project.slug)) throw new Error(`Slug inválido: ${project.slug}`);
    const directory = resolve(destination, 'projetos', project.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), casePage(project, base));
  }
  await writeFile(resolve(destination, '404.html'), layout({ base, title: 'Página não encontrada', noindex: true, body: `<section class="not-found wrap"><span class="eyebrow">404 / FORA DO ENQUADRAMENTO</span><h1>Outro olhar.</h1><p>Essa página não está por aqui. Os projetos estão logo ali.</p><a href="${base}#projetos">Explorar o portfólio ↗</a></section>` }));
  await writeFile(resolve(destination, '.nojekyll'), '');
  return { outDir: destination, base, pages: projects.length + 4 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseIndex = process.argv.indexOf('--base');
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : process.env.BASE_PATH || '/';
  if (!base) throw new Error('Informe um caminho após --base.');
  const result = await build({ base });
  console.log(`Build concluído: ${result.pages} páginas em dist/ (base: ${result.base})`);
}

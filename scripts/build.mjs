import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/content.mjs';
import { home, casePage, layout, normalizeBase } from '../src/templates.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function build({ outDir = resolve(root, 'dist'), base = '/' } = {}) {
  base = normalizeBase(base);
  // Never permit a custom output to replace project sources or their parents.
  const destination = resolve(outDir);
  if (root === destination || root.startsWith(`${destination}/`) || (destination.startsWith(`${root}/`) && destination !== resolve(root, 'dist'))) {
    throw new Error('Diretório de saída não pode substituir arquivos-fonte.');
  }
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(resolve(root, 'public'), destination, { recursive: true });
  await writeFile(resolve(destination, 'index.html'), home(base));
  for (const project of projects) {
    if (!/^[a-z0-9-]+$/.test(project.slug)) throw new Error(`Slug inválido: ${project.slug}`);
    const directory = resolve(destination, 'projetos', project.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), casePage(project, base));
  }
  await writeFile(resolve(destination, '404.html'), layout({ base, title: 'Página não encontrada', noindex: true, body: `<section class="not-found wrap"><span class="eyebrow">404 / FORA DO ENQUADRAMENTO</span><h1>Outro olhar.</h1><p>Essa página não está por aqui. Os projetos estão logo ali.</p><a href="${base}#projetos">Explorar o portfólio ↗</a></section>` }));
  await writeFile(resolve(destination, '.nojekyll'), '');
  return { outDir: destination, base, pages: projects.length + 2 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseIndex = process.argv.indexOf('--base');
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : process.env.BASE_PATH || '/';
  if (!base) throw new Error('Informe um caminho após --base.');
  const result = await build({ base });
  console.log(`Build concluído: ${result.pages} páginas em dist/ (base: ${result.base})`);
}

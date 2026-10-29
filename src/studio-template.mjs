import { escape, asset } from './templates.mjs';

export function studioPage(base = '/') {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#ffffff"><title>Estúdio — Ícaro Braga</title>
<link rel="icon" href="${asset(base, 'favicon.svg')}" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="${asset(base, 'portfolio.css')}"><link rel="stylesheet" href="${asset(base, 'studio.css')}"><script src="${asset(base, 'studio.js')}" type="module"></script></head>
<body data-base="${escape(base)}"><a class="studio-skip" href="#studio-main">Pular para o conteúdo</a><div id="studio-root"><main id="studio-main" class="studio-loading"><span class="brand-mark">ib<span>.</span></span><p>Abrindo seu estúdio…</p></main></div><div id="studio-toast" role="status" aria-live="polite"></div><input type="file" id="studio-files" accept="image/png,image/jpeg,image/webp,image/gif" hidden><dialog id="studio-dialog"></dialog></body></html>`;
}

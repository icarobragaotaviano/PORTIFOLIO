import { importSuppliedProjects } from './project-imports.js';

/** Shared, dependency-free presentation for the public portfolio and editor preview. */
export const escapePortfolio = (value = '') => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

const text = value => String(value ?? '');
const list = value => Array.isArray(value) ? value : [];
const color = (value, fallback) => /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(text(value)) ? value : fallback;
const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const basePath = base => /^\/(?:[\w-]+\/)*$/.test(text(base)) ? base : '/';
const isDark = hex => {
  const value = hex.length === 4 ? hex.slice(1).split('').map(character => character + character).join('') : hex.slice(1);
  const [red, green, blue] = [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  return red * .299 + green * .587 + blue * .114 < 140;
};

export function portfolioMediaURL(value, base = '/') {
  const source = text(value).trim();
  if (!source || /[\u0000-\u001f\\]/.test(source) || source.startsWith('//')) return '';
  if (/^https?:\/\//i.test(source)) {
    try { const url = new URL(source); return url.username || url.password ? '' : url.href; } catch { return ''; }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(source) || /(?:^|\/)\.\.?(?:\/|$)/.test(source.split(/[?#]/)[0])) return '';
  const prefix = basePath(base);
  return source.startsWith(prefix) && prefix !== '/' ? source : `${prefix}${source.replace(/^\/+/, '')}`;
}

export function portfolioEmbedURL(value) {
  try {
    const url = new URL(text(value));
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
      const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return /^[\w-]{11}$/.test(id || '') ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch { /* An invalid embed never becomes executable markup. */ }
  return '';
}

export function normalizePublicProject(project = {}) {
  const legacy = !Array.isArray(project.blocks);
  const blocks = list(project.blocks).map(block => ({ ...block }));
  if (legacy && project.status !== 'placeholder') {
    blocks.push(
      ...(project.intro ? [{ id: 'intro', type: 'text', text: project.intro, format: 'heading', size: 'normal' }] : []),
      ...[['O desafio', project.challenge], ['O conceito', project.concept], ['A expressão', project.solution]]
        .filter(([, body]) => body).flatMap(([heading, body], index) => [
          { id: `story-title-${index}`, type: 'text', text: heading, format: 'subheading', size: 'normal' },
          { id: `story-${index}`, type: 'text', text: body, size: 'normal' },
        ]),
      ...list(project.gallery).map((entry, index) => ({
        id: `gallery-${index + 1}`, type: 'image', src: entry.image || entry.src,
        alt: text(entry.alt), caption: text(entry.caption), size: 'full',
      })),
      ...(list(project.deliverables).length ? [{ id: 'deliverables', type: 'text', text: `Entregas\n\n${project.deliverables.join(' · ')}`, size: 'normal' }] : []),
    );
  }
  return {
    ...project,
    id: text(project.id || project.slug),
    slug: text(project.slug),
    title: text(project.title || 'Projeto sem título'),
    category: text(project.category || 'Design'),
    description: text(project.description ?? project.subtitle ?? ''),
    cover: text(project.cover ?? project.image ?? ''),
    coverAlt: text(project.coverAlt ?? project.alt ?? project.title ?? ''),
    publication: project.publication || 'published',
    status: project.status === 'published' ? 'real' : project.status,
    tags: list(project.tags).map(text).filter(Boolean),
    tools: list(project.tools).map(text).filter(Boolean),
    credits: (typeof project.credits === 'string' ? project.credits.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : list(project.credits)).map(credit => typeof credit === 'string' ? { name: credit, role: '' } : credit),
    services: list(project.services).map(text).filter(Boolean),
    blocks,
    styles: { background: color(project.styles?.background, '#171715'), spacing: number(project.styles?.spacing, 0, 0, 160), width: number(project.styles?.width, 1400, 640, 1800) },
  };
}

const projectLink = (project, base) => `${basePath(base)}projetos/${encodeURIComponent(project.slug)}/`;
const statusLabel = project => project.status === 'demo' ? 'Estudo conceitual' : project.status === 'placeholder' ? 'Em breve' : '';

export function renderPortfolioCard(input, base = '/', { eager = false } = {}) {
  const project = normalizePublicProject(input);
  const src = portfolioMediaURL(project.cover, base);
  const badge = statusLabel(project);
  return `<article class="project-card pf-card" data-category="${escapePortfolio(project.category)}" data-portfolio-search="${escapePortfolio([project.title, project.category, project.description, ...project.tags].join(' '))}">
    <a class="pf-card-link" href="${escapePortfolio(projectLink(project, base))}" aria-label="Ver projeto: ${escapePortfolio(project.title)}">
      <div class="pf-card-cover">${src ? `<img src="${escapePortfolio(src)}" alt="${escapePortfolio(project.coverAlt)}" width="808" height="632" loading="${eager ? 'eager' : 'lazy'}" decoding="async">` : `<div class="pf-cover-empty"><span>EM PROCESSO</span><strong>${escapePortfolio(project.title)}</strong><span>UMA NOVA HISTÓRIA, EM BREVE.</span></div>`}
        <span class="pf-card-open" aria-hidden="true">↗</span>${badge ? `<span class="pf-card-badge">${escapePortfolio(badge)}</span>` : ''}
      </div>
      <div class="pf-card-caption"><h3>${escapePortfolio(project.title)}</h3><span aria-hidden="true">↗</span></div>
      <p class="pf-card-category">${escapePortfolio(project.category)}</p>
    </a>
  </article>`;
}

export function renderPortfolioGallery(inputs = [], base = '/') {
  const projects = list(inputs).map(normalizePublicProject);
  const categories = [...new Set(projects.map(project => project.category))];
  return `<div class="portfolio-gallery" data-portfolio-gallery>
    <div class="pf-gallery-toolbar">
      <div class="pf-filters" role="group" aria-label="Filtrar projetos por área"><button type="button" data-portfolio-filter="" aria-pressed="true">Todos os projetos <span>${projects.length}</span></button>${categories.map(category => `<button type="button" data-portfolio-filter="${escapePortfolio(category)}" aria-pressed="false">${escapePortfolio(category)}</button>`).join('')}</div>
      <label class="pf-search"><span aria-hidden="true">⌕</span><span class="sr-only">Buscar projetos</span><input type="search" data-portfolio-search-input placeholder="Buscar projetos" autocomplete="off"></label>
    </div>
    <p class="pf-gallery-summary"><span data-portfolio-result-count>${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}</span><span>ÍCARO BRAGA / PORTFÓLIO</span></p>
    <div class="project-grid pf-gallery-grid">${projects.map((project, index) => renderPortfolioCard(project, base, { eager: index < 3 })).join('')}</div>
    <div class="pf-gallery-empty" data-portfolio-empty ${projects.length ? 'hidden' : ''}><span aria-hidden="true">↗</span><h3>${projects.length ? 'Um novo olhar na busca.' : 'O próximo projeto começa aqui.'}</h3><p>${projects.length ? 'Nenhum projeto encontrado. Experimente outra palavra ou área criativa.' : 'Novos trabalhos serão apresentados neste espaço.'}</p><button type="button" data-portfolio-reset ${projects.length ? '' : 'hidden'}>Ver todos os projetos</button></div>
    <p class="sr-only" data-portfolio-status role="status" aria-live="polite"></p>
  </div>`;
}

function imageMarkup(image, base, { eager = false, cover = false, sizes = '100vw' } = {}) {
  const src = portfolioMediaURL(image.src || image.url, base);
  if (!src) return '';
  const alt = text(image.alt);
  const width = Number.isInteger(image.width) && image.width > 0 ? image.width : 0;
  const height = Number.isInteger(image.height) && image.height > 0 ? image.height : 0;
  const small = portfolioMediaURL(image.responsiveSrc, base);
  const dimensions = width && height ? ` width="${width}" height="${height}"` : '';
  const responsive = small && width > 960 ? ` srcset="${escapePortfolio(small)} 960w, ${escapePortfolio(src)} ${width}w" sizes="${escapePortfolio(sizes)}"` : '';
  return `<figure${cover ? ' class="case-cover"' : ' class="pf-figure"'}><button type="button" class="pf-image-button" data-pf-image="${escapePortfolio(src)}" data-pf-image-alt="${escapePortfolio(alt)}" aria-label="Ampliar imagem${alt ? `: ${escapePortfolio(alt)}` : ''}"><img src="${escapePortfolio(src)}"${responsive}${dimensions} alt="${escapePortfolio(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}><span class="pf-image-expand" aria-hidden="true">⤢</span></button>${image.caption ? `<figcaption>${escapePortfolio(image.caption)}</figcaption>` : ''}</figure>`;
}

export function renderPortfolioBlock(block, base = '/', { eager = false } = {}) {
  if (!block || typeof block !== 'object') return '';
  const size = ['full', 'wide', 'normal'].includes(block.size) ? block.size : 'full';
  const align = ['left', 'center', 'right'].includes(block.align) ? block.align : 'left';
  const classes = `pf-block pf-block-${escapePortfolio(block.type)} pf-size-${size} pf-align-${align}`;
  if (block.type === 'image') return `<div class="${classes}">${imageMarkup(block, base, { eager })}</div>`;
  if (block.type === 'text') {
    const value = text(block.text || block.body);
    if (!value) return '';
    const format = block.format || (block.heading ? 'heading' : 'paragraph');
    const heading = block.heading && block.text ? `<h2>${escapePortfolio(block.heading)}</h2>` : '';
    const body = format === 'heading' ? `<h2>${escapePortfolio(value)}</h2>` : format === 'subheading' ? `<h3>${escapePortfolio(value)}</h3>` : value.split(/\n\s*\n/).map(paragraph => `<p>${escapePortfolio(paragraph).replaceAll('\n', '<br>')}</p>`).join('');
    return `<section class="${classes} pf-text-${format === 'heading' || format === 'subheading' ? format : 'paragraph'}">${heading}${body}${block.caption ? `<p class="pf-block-caption">${escapePortfolio(block.caption)}</p>` : ''}</section>`;
  }
  if (block.type === 'grid') {
    // Only the documented layouts become classes; user text cannot become CSS.
    const layout = ['identity', 'triptych', 'campaign', 'brand-showcase'].includes(block.layout) ? block.layout : 'uniform';
    const sizes = layout === 'identity' ? '(max-width: 650px) 90vw, 50vw' : layout === 'triptych' ? '(max-width: 650px) 90vw, 33vw' : layout === 'campaign' ? '(max-width: 650px) 90vw, 66vw' : '50vw';
    const imageSizes = index => layout === 'brand-showcase'
      ? `(max-width: 650px) ${[1, 3].includes(index) ? '44vw' : '90vw'}, ${index === 4 ? '100vw' : index === 0 ? '50vw' : '25vw'}`
      : sizes;
    return `<div class="${classes} pf-grid-layout-${layout}"><div class="pf-image-grid pf-grid-${layout}">${list(block.images).map((item, index) => imageMarkup(typeof item === 'string' ? { src: item } : item, base, { eager: eager && index === 0, sizes: imageSizes(index) })).join('')}</div>${block.caption ? `<p class="pf-block-caption">${escapePortfolio(block.caption)}</p>` : ''}</div>`;
  }
  if (block.type === 'video') {
    const embedded = portfolioEmbedURL(block.src || block.url);
    if (embedded) return `<figure class="${classes}"><div class="pf-embed"><iframe src="${escapePortfolio(embedded)}" title="${escapePortfolio(block.alt || block.caption || 'Vídeo do projeto')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>${block.caption ? `<figcaption>${escapePortfolio(block.caption)}</figcaption>` : ''}</figure>`;
    const src = portfolioMediaURL(block.src || block.url, base);
    if (!src) return '';
    return `<figure class="${classes}"><video controls playsinline preload="metadata"${portfolioMediaURL(block.poster, base) ? ` poster="${escapePortfolio(portfolioMediaURL(block.poster, base))}"` : ''}><source src="${escapePortfolio(src)}">Seu navegador não consegue reproduzir este vídeo.</video>${block.caption ? `<figcaption>${escapePortfolio(block.caption)}</figcaption>` : ''}</figure>`;
  }
  if (block.type === 'embed') {
    const src = portfolioEmbedURL(block.src || block.url);
    if (!src) return '';
    return `<figure class="${classes}"><div class="pf-embed"><iframe src="${escapePortfolio(src)}" title="${escapePortfolio(block.alt || block.caption || 'Vídeo do projeto')}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>${block.caption ? `<figcaption>${escapePortfolio(block.caption)}</figcaption>` : ''}</figure>`;
  }
  if (block.type === 'divider') return `<div class="${classes}" aria-hidden="true"><hr></div>`;
  return '';
}

export function renderPortfolioProject(input, base = '/', allProjects = []) {
  const project = normalizePublicProject(input);
  const e = escapePortfolio;
  const placeholder = project.status === 'placeholder';
  const demo = project.status === 'demo';
  const displayYear = project.year && !/^ano n[aã]o informado$/i.test(text(project.year).trim()) ? project.year : '';
  const hasCoverInBlocks = project.blocks.some(block => block.type === 'image' ? block.src === project.cover : block.type === 'grid' && list(block.images).some(image => image?.src === project.cover));
  const published = list(allProjects).map(normalizePublicProject).filter(item => item.publication === 'published');
  const related = published.filter(item => item.slug !== project.slug).slice(0, 3);
  const projectIndex = published.findIndex(item => item.slug === project.slug);
  const previous = published.length > 1 && projectIndex >= 0 ? published[(projectIndex - 1 + published.length) % published.length] : null;
  const next = published.length > 1 && projectIndex >= 0 ? published[(projectIndex + 1) % published.length] : null;
  const styles = project.styles;
  const darkCanvas = isDark(styles.background);
  const info = [
    ['ÁREA CRIATIVA', project.category],
    ...(project.client ? [['CLIENTE', text(project.client)]] : []),
    ...(displayYear ? [['ANO', text(displayYear)]] : []),
    ...(demo ? [['NATUREZA', 'Estudo autoral fictício']] : placeholder ? [['STATUS', 'Aguardando conteúdo real']] : []),
  ];
  return `<article class="pf-project" data-portfolio-slug="${e(project.slug)}" style="--pf-canvas-bg:${e(styles.background)};--pf-canvas-ink:${darkCanvas ? '#f1f0e9' : '#1a1915'};--pf-canvas-muted:${darkCanvas ? '#b6b5aa' : '#615e55'};--pf-canvas-width:${styles.width}px;--pf-block-gap:${styles.spacing}px">
    <header class="pf-project-header wrap"><a class="pf-back" href="${e(basePath(base))}#projetos">← Todos os projetos</a>
      <div class="pf-project-title-row"><div><p class="pf-project-category">${e(project.category)}${displayYear ? `<span> / ${e(displayYear)}</span>` : ''}</p><h1>${e(project.title)}</h1>${project.description ? `<p class="pf-project-description">${e(project.description)}</p>` : ''}</div>${demo || placeholder ? `<span class="pf-project-badge">${placeholder ? 'ESPAÇO RESERVADO' : 'CASE DEMONSTRATIVO'}</span>` : ''}</div>
      <div class="pf-project-author"><a class="pf-author" href="${e(basePath(base))}#sobre"><span class="pf-avatar" aria-hidden="true">IB<span>✳</span></span><span><strong>Ícaro Braga</strong><small>Direção de arte &amp; Design · Fortaleza, BR</small></span></a><a class="pf-contact" href="${e(basePath(base))}#contato">Vamos criar juntos <span aria-hidden="true">↗</span></a></div>
    </header>
    <nav class="pf-case-nav" aria-label="Navegação entre projetos"><div class="pf-case-nav-inner wrap">
      <a class="pf-case-all" href="${e(basePath(base))}#projetos"><span aria-hidden="true">←</span><span>Todos os projetos</span></a>
      <p class="pf-case-current">${projectIndex >= 0 ? `<span>${String(projectIndex + 1).padStart(2, '0')} / ${String(published.length).padStart(2, '0')}</span>` : ''}<strong>${e(project.title)}</strong></p>
      <div class="pf-case-steps">${previous ? `<a href="${e(projectLink(previous, base))}" aria-label="Projeto anterior: ${e(previous.title)}" title="${e(previous.title)}"><span aria-hidden="true">←</span><span>Anterior</span></a>` : ''}${next ? `<a href="${e(projectLink(next, base))}" aria-label="Próximo projeto: ${e(next.title)}" title="${e(next.title)}"><span>Próximo</span><span aria-hidden="true">→</span></a>` : ''}</div>
    </div></nav>
    <div class="pf-project-stage"><div class="pf-project-canvas">
      ${placeholder ? `<section class="pf-placeholder"><span>UM NOVO CAPÍTULO</span><h2>${e(project.title)}<i>Em breve.</i></h2><p>Boas histórias merecem seu tempo. Este espaço receberá os materiais, o escopo e os créditos do projeto.</p></section>` : `${project.cover && !hasCoverInBlocks ? `<div class="pf-cover-block">${imageMarkup({ src: project.cover, alt: project.coverAlt }, base, { eager: true, cover: true })}</div>` : ''}${project.blocks.map((block, index) => renderPortfolioBlock(block, base, { eager: index === 0 && (!project.cover || hasCoverInBlocks) })).join('')}${!project.blocks.length && project.description ? renderPortfolioBlock({ type: 'text', text: project.description, size: 'normal' }, base) : ''}`}
    </div></div>
    <section class="pf-project-details wrap" aria-label="Informações do projeto"><div class="pf-project-ending"><span class="pf-ending-symbol" aria-hidden="true">✳</span><p>Design que conecta<br><strong>ideia e expressão.</strong></p><a href="${e(basePath(base))}#contato">Vamos conversar ↗</a></div>
      <div class="pf-details-grid"><div><p class="pf-detail-label">${placeholder ? 'PRÓXIMO CAPÍTULO' : 'SOBRE O PROJETO'}</p><h2>${e(project.title)}</h2>${project.description ? `<p class="pf-detail-description">${e(project.description)}</p>` : ''}${project.tags.length ? `<div class="pf-tags" aria-label="Tags do projeto">${project.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div>` : ''}</div><dl class="pf-project-facts">${info.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}${project.tools.length ? `<div><dt>FERRAMENTAS</dt><dd>${project.tools.map(e).join(' · ')}</dd></div>` : ''}${project.services.length ? `<div><dt>DISCIPLINAS</dt><dd>${project.services.map(e).join(' · ')}</dd></div>` : ''}</dl></div>
      ${project.credits.length ? `<div class="pf-project-credits"><p class="pf-detail-label">CRÉDITOS</p><div>${project.credits.map(credit => `<p><strong>${e(credit.name || credit.title)}</strong>${credit.role ? `<span>${e(credit.role)}</span>` : ''}</p>`).join('')}</div></div>` : ''}
      ${project.note ? `<aside class="pf-project-note"><span aria-hidden="true">✳</span><p>${e(project.note)}</p></aside>` : ''}
      <div class="pf-project-bottom"><a class="pf-author" href="${e(basePath(base))}#sobre"><span class="pf-avatar" aria-hidden="true">IB<span>✳</span></span><span><strong>Ícaro Braga</strong><small>Designer &amp; Diretor de arte</small></span></a><div><button type="button" class="pf-share" data-pf-share>Compartilhar projeto ↗</button><span class="sr-only" data-pf-share-status role="status"></span><a class="pf-top" href="#inicio" aria-label="Voltar ao topo">↑</a></div></div>
    </section>
    ${related.length ? `<section class="pf-related wrap" aria-label="Mais projetos"><div class="pf-related-heading"><h2>Mais do meu trabalho<span>.</span></h2><a href="${e(basePath(base))}#projetos">Todos os projetos ↗</a></div><div class="pf-related-grid">${related.map(item => renderPortfolioCard(item, base)).join('')}</div></section>` : ''}
  </article>`;
}

const fold = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

let revealObserver;
function enhanceReveals(root = document) {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!revealObserver) revealObserver = new IntersectionObserver(entries => {
    let stagger = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      if (typeof entry.target.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // The animation never sets a persistent hidden state: without scripting,
      // intersection events or animation support, all content remains readable.
      entry.target.animate([
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 400, delay: Math.min(stagger++ * 45, 90), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
  }, { threshold: .06, rootMargin: '0px 0px -18px 0px' });
  root.querySelectorAll('.pf-card,.pf-project-header,.pf-block,.pf-project-details,.pf-related-heading').forEach(element => {
    if (element.dataset.pfReveal || element.closest('.studio-preview')) return;
    element.dataset.pfReveal = 'true';
    // Already-visible content stays still, including after a live data refresh.
    if (element.getBoundingClientRect().top < window.innerHeight - 20) return;
    revealObserver.observe(element);
  });
}

function enhanceGallery(gallery) {
  if (!gallery || gallery.dataset.enhanced) return;
  gallery.dataset.enhanced = 'true';
  const buttons = [...gallery.querySelectorAll('[data-portfolio-filter]')];
  const input = gallery.querySelector('[data-portfolio-search-input]');
  const cards = [...gallery.querySelectorAll('.pf-card')];
  let filter = '';
  const update = () => {
    let count = 0;
    const query = fold(input.value.trim());
    cards.forEach(card => {
      const match = (!filter || card.dataset.category === filter) && fold(card.dataset.portfolioSearch).includes(query);
      card.hidden = !match;
      if (match) count += 1;
    });
    const result = `${count} ${count === 1 ? 'projeto' : 'projetos'}`;
    gallery.querySelector('[data-portfolio-result-count]').textContent = result;
    gallery.querySelector('[data-portfolio-status]').textContent = `${result} ${count === 1 ? 'encontrado' : 'encontrados'}.`;
    gallery.querySelector('[data-portfolio-empty]').hidden = count > 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.portfolioFilter === filter)));
  };
  buttons.forEach(button => button.addEventListener('click', () => { filter = button.dataset.portfolioFilter; update(); }));
  input.addEventListener('input', update);
  gallery.querySelector('[data-portfolio-reset]').addEventListener('click', () => { filter = ''; input.value = ''; update(); input.focus(); });
}

async function publicProjects(base, slug = '') {
  let local;
  try { local = JSON.parse(localStorage.getItem('ib_studio_projects_v1') || 'null'); } catch {}
  let data;
  // Keep the selected case and its previous/next links in the same collection.
  const url = `${basePath(base)}api/portfolio?action=public`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    if (response.ok) data = await response.json();
  } catch { /* The local Studio remains available when its server is offline. */ }
  if (Array.isArray(local) && local.length) {
    local = importSuppliedProjects(local, list(data?.projects), localStorage);
    // Refresh this newly supplied case in older local Studio collections while
    // preserving other local work and later edits made by the owner.
    const wine = data?.project?.slug === 'winegourmet' ? data.project : list(data?.projects).find(item => item.slug === 'winegourmet');
    let refreshed = false;
    local = local.map(project => {
      if (project.slug !== 'winegourmet' || project.publication !== 'published' || !wine || !(Date.parse(wine.updatedAt) > (Date.parse(project.updatedAt) || 0))) return project;
      refreshed = true;
      return wine;
    });
    if (refreshed) try { localStorage.setItem('ib_studio_projects_v1', JSON.stringify(local)); } catch {}
    const published = local.filter(project => project.publication === 'published');
    return slug ? { projects: published, project: published.find(item => item.slug === slug) || null } : { projects: published };
  }
  return Array.isArray(data?.projects) || data?.project ? data : null;
}

function enhanceImages() {
  if (document.documentElement.dataset.portfolioImages) return;
  document.documentElement.dataset.portfolioImages = 'true';
  let dialog;
  let images = [];
  let current = 0;
  const show = () => {
    const selected = images[current];
    dialog.querySelector('img').src = selected.dataset.pfImage;
    dialog.querySelector('img').alt = selected.dataset.pfImageAlt || '';
    dialog.querySelector('[data-pf-lightbox-count]').textContent = `${current + 1} / ${images.length}`;
    dialog.querySelectorAll('[data-pf-lightbox-step]').forEach(button => { button.hidden = images.length < 2; });
    dialog.classList.remove('is-zoomed');
  };
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-pf-image]');
    if (!target) return;
    images = [...target.closest('.pf-project').querySelectorAll('[data-pf-image]')];
    current = images.indexOf(target);
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'pf-lightbox';
      dialog.setAttribute('aria-label', 'Visualização ampliada da imagem');
      dialog.innerHTML = '<div class="pf-lightbox-toolbar"><span data-pf-lightbox-count></span><div><button type="button" data-pf-lightbox-zoom aria-label="Alternar tamanho original">⤢</button><button type="button" data-pf-lightbox-close aria-label="Fechar imagem">×</button></div></div><button type="button" class="pf-lightbox-prev" data-pf-lightbox-step="-1" aria-label="Imagem anterior">←</button><div class="pf-lightbox-image"><img alt=""></div><button type="button" class="pf-lightbox-next" data-pf-lightbox-step="1" aria-label="Próxima imagem">→</button>';
      document.body.append(dialog);
      dialog.querySelector('[data-pf-lightbox-close]').addEventListener('click', () => dialog.close());
      dialog.querySelector('[data-pf-lightbox-zoom]').addEventListener('click', () => dialog.classList.toggle('is-zoomed'));
      dialog.querySelectorAll('[data-pf-lightbox-step]').forEach(button => button.addEventListener('click', () => { current = (current + Number(button.dataset.pfLightboxStep) + images.length) % images.length; show(); }));
      dialog.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); current = (current + (event.key === 'ArrowLeft' ? -1 : 1) + images.length) % images.length; show();
      });
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    }
    show(); dialog.showModal();
  });
}

function enhanceShare() {
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-pf-share]');
    if (!button) return;
    if (button.closest('.studio-preview')) return;
    const status = button.parentElement.querySelector('[data-pf-share-status]');
    try {
      const url = new URL(window.location.href); url.hash = '';
      if (navigator.share) await navigator.share({ title: document.title, url: url.href });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); status.textContent = 'Link do projeto copiado.'; button.textContent = 'Link copiado ✓'; setTimeout(() => { button.textContent = 'Compartilhar projeto ↗'; }, 2500); }
      else { status.textContent = 'Copie o endereço desta página para compartilhar o projeto.'; }
    } catch (error) { if (error.name !== 'AbortError') status.textContent = 'Copie o endereço desta página para compartilhar o projeto.'; }
  });
}

async function initializePortfolio() {
  const base = document.body.dataset.base || document.querySelector('meta[name="portfolio-base"]')?.content || '/';
  const gallery = document.querySelector('[data-portfolio-gallery]');
  enhanceGallery(gallery); enhanceImages(); enhanceShare(); enhanceReveals();
  if (gallery) {
    try {
      const data = await publicProjects(base);
      if (!data || !Array.isArray(data.projects)) return;
      const projects = data.projects.filter(project => project.publication === 'published');
      gallery.outerHTML = renderPortfolioGallery(projects, base);
      enhanceGallery(document.querySelector('[data-portfolio-gallery]'));
      enhanceReveals(document.querySelector('[data-portfolio-gallery]'));
      const count = document.querySelector('#navigation a[href$="#projetos"] span');
      if (count) count.textContent = String(projects.length).padStart(2, '0');
      const note = document.querySelector('[data-portfolio-demo-note]');
      if (note) {
        note.hidden = !projects.some(project => project.status === 'demo' || project.status === 'placeholder');
        const paragraph = note.querySelector('p');
        if (paragraph) paragraph.textContent = 'Estudos conceituais e espaços reservados estão identificados nas capas e nas notas de contexto de cada projeto.';
      }
    } catch { /* Static portfolio remains usable when the publishing service is unavailable. */ }
  } else {
    const article = document.querySelector('.pf-project[data-portfolio-slug]');
    const slugMatch = !article ? window.location.pathname.match(/\/projetos\/([a-z0-9-]+)\/?/) : null;
    const targetSlug = article?.dataset.portfolioSlug || slugMatch?.[1] || '';
    if (!targetSlug) return;
    try {
      const data = await publicProjects(base, targetSlug);
      if (!data) return;
      const projects = list(data.projects).filter(project => project.publication === 'published');
      const project = data.project || projects.find(item => item.slug === targetSlug);
      if (!project || project.publication !== 'published') return;
      if (article) article.outerHTML = renderPortfolioProject(project, base, projects);
      else {
        const main = document.querySelector('#conteudo');
        if (main) main.innerHTML = renderPortfolioProject(project, base, projects);
      }
      enhanceReveals();
      document.title = `${project.title} — Ícaro Braga Otaviano`;
    } catch { /* Keep the server-rendered project if the request fails. */ }
  }
}

if (typeof document !== 'undefined') initializePortfolio();

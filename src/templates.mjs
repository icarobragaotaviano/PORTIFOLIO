import { site, projects, profile, resume } from './content.mjs';
import { renderPortfolioGallery, renderPortfolioProject } from '../public/portfolio.js';

export const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const normalizeBase = (base = '/') => {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('BASE_PATH deve ser / ou /nome-do-repositorio/');
  return base;
};

export const asset = (base, path) => `${base}${String(path).replace(/^\//, '')}`;
const arrow = '<span aria-hidden="true">↗</span>';

function header(base, isHome) {
  const prefix = isHome ? '' : base;
  return `<header class="site-header wrap">
    <a class="wordmark" href="${base}" aria-label="${escape(site.name)} — início"><span>${escape(site.wordmark.primary)}<span class="brand-dot">.</span></span><span class="wordmark-caption">Design &amp; direção de arte</span></a>
    <button class="menu-toggle" type="button" aria-controls="navigation" aria-expanded="false" hidden>Menu <span aria-hidden="true">+</span></button>
    <nav id="navigation" aria-label="Navegação principal"><a href="${prefix}#projetos">Trabalhos</a><a href="${prefix}#sobre">Quem sou eu</a><a href="${prefix}#experiencia">Experiência</a><a href="${prefix}#contato">Contato ${arrow}</a><a href="${asset(base, 'studio/')}" class="nav-studio-link">Área privada</a></nav>
  </header>`;
}

function footer(base) {
  const contact = site.email ? `mailto:${escape(site.email)}` : escape(site.github);
  return `<footer id="contato" class="contact-section wrap">
    <div class="section-label"><span>04 / Contato</span><span>Tem uma ideia em mente?</span></div>
    <a class="contact-title" href="${contact}">Vamos conversar<span aria-hidden="true">↗</span></a>
    <div class="contact-details"><a href="${contact}">${escape(site.email || 'GitHub')} ${arrow}</a><a href="${escape(site.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp ${arrow}</a><span>${escape(site.location)}</span></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escape(site.shortName)}.</span><a href="${asset(base, 'studio/')}" class="owner-link">🔒 Área privada · Estúdio</a><a href="#inicio">Voltar ao topo ↑</a></div>
  </footer>`;
}

export function layout({ base = '/', title, description = site.description, body, isHome = false, noindex = false }) {
  const pageTitle = title ? `${title} — ${site.name}` : `${site.shortName} — Design & direção de arte`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#111110">
<title>${escape(pageTitle)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(pageTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400&display=swap" rel="stylesheet">
<meta name="portfolio-base" content="${escape(base)}"><link rel="icon" href="${asset(base, 'favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${asset(base, 'styles.css')}"><link rel="stylesheet" href="${asset(base, 'portfolio.css')}"><script src="${asset(base, 'app.js')}" defer></script><script type="module" src="${asset(base, 'portfolio.js')}"></script></head>
<body id="inicio" data-base="${escape(base)}"><a class="skip-link" href="#conteudo">Pular para o conteúdo</a>${header(base, isHome)}<main id="conteudo">${body}</main>${footer(base)}</body></html>`;
}

function experienceRow(item) {
  return `<article class="experience-row"><div><h3>${escape(item.company)}</h3><p class="experience-location">${escape(item.location)}</p></div><div><p class="experience-role">${escape(item.role)}</p><p class="experience-description">${escape(item.bullets?.[0] || item.focus)}</p></div></article>`;
}

export function home(base = '/', portfolioProjects = projects) {
  const experiences = resume.experiences || [];
  const visibleProjects = Array.isArray(portfolioProjects) ? portfolioProjects : [];
  return layout({ base, isHome: true, body: `
    <section class="hero wrap" aria-labelledby="hero-title"><div class="hero-heading"><p class="eyebrow">Ícaro Braga / Portfólio</p><h1 id="hero-title">Ideias claras.<br>Imagens que ficam<span class="brand-dot">.</span></h1></div><div class="hero-aside"><p>Design, direção de arte,<br>fotografia &amp; audiovisual.</p><a class="text-link" href="#projetos">Conheça meu trabalho <span aria-hidden="true">↓</span></a></div></section>
    <section id="projetos" class="work-section wrap" aria-labelledby="work-title"><div class="section-label"><h2 id="work-title">01 / Trabalhos selecionados</h2><span class="section-meta-group"><span>${String(visibleProjects.length).padStart(2, '0')} projetos</span><a href="${asset(base, 'studio/')}" class="section-studio-link">Estúdio ↗</a></span></div>${renderPortfolioGallery(visibleProjects, base)}</section>
    <section id="sobre" class="about-section wrap" aria-labelledby="about-title"><div class="section-label"><h2 id="about-title">02 / Quem sou eu</h2><span>${escape(site.location)}</span></div><div class="about-grid"><div class="about-heading"><h3>Prazer,<br>sou Ícaro<span class="brand-dot">.</span></h3><span class="about-experience">${escape(site.experienceYears)} de experiência</span></div><div class="about-copy"><p class="about-intro">Sou designer gráfico e visual. Conecto conceito e execução para dar forma a marcas, histórias e experiências.</p><p>${escape(profile.summary)}</p><ul class="discipline-list">${profile.pillars.map((item) => `<li>${escape(item.title)}</li>`).join('')}</ul></div></div></section>
    <section id="experiencia" class="experience-section wrap" aria-labelledby="experience-title"><div class="section-label"><h2 id="experience-title">03 / Experiência profissional</h2><span>Trajetória &amp; colaboração</span></div><div class="experience-list">${experiences.slice(0, 5).map(experienceRow).join('')}</div>${experiences.length > 5 ? `<details class="more-experience"><summary>Ver mais experiências <span aria-hidden="true">+</span></summary><div class="experience-list">${experiences.slice(5).map(experienceRow).join('')}</div></details>` : ''}</section>` });
}

export function casePage(project, base = '/') {
  return layout({
    base,
    title: project.title,
    description: project.intro || project.description,
    body: renderPortfolioProject(project, base, projects),
  });
}

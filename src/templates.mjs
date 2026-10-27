import { site, projects, profile, resume } from './content.mjs';

export const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const normalizeBase = (base = '/') => {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('BASE_PATH deve ser / ou /nome-do-repositorio/');
  return base;
};

export const asset = (base, path) => `${base}${String(path).replace(/^\//, '')}`;
const arrow = '<span aria-hidden="true">↗</span>';
const projectLink = (base, project) => asset(base, `projetos/${project.slug}/`);
const number = (index) => String(index + 1).padStart(2, '0');

function header(base, isHome) {
  const prefix = isHome ? '' : base;
  return `<header class="site-header wrap">
    <a class="wordmark" href="${base}" aria-label="${escape(site.name)} — início"><span>${escape(site.wordmark.primary)}<span class="brand-dot">.</span></span><span class="wordmark-caption">Design &amp; direção de arte</span></a>
    <button class="menu-toggle" type="button" aria-controls="navigation" aria-expanded="false" hidden>Menu <span aria-hidden="true">+</span></button>
    <nav id="navigation" aria-label="Navegação principal"><a href="${prefix}#projetos">Trabalhos</a><a href="${prefix}#sobre">Quem sou eu</a><a href="${prefix}#experiencia">Experiência</a><a href="${prefix}#contato">Contato ${arrow}</a></nav>
  </header>`;
}

function footer(base) {
  const contact = site.email ? `mailto:${escape(site.email)}` : escape(site.github);
  return `<footer id="contato" class="contact-section wrap">
    <div class="section-label"><span>04 / Contato</span><span>Tem uma ideia em mente?</span></div>
    <a class="contact-title" href="${contact}">Vamos conversar<span aria-hidden="true">↗</span></a>
    <div class="contact-details"><a href="${contact}">${escape(site.email || 'GitHub')} ${arrow}</a><a href="${escape(site.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp ${arrow}</a><span>${escape(site.location)}</span></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escape(site.shortName)}.</span><a href="${asset(base, 'admin/')}" class="owner-link">Área privada</a><a href="#inicio">Voltar ao topo ↑</a></div>
  </footer>`;
}

export function layout({ base = '/', title, description = site.description, body, isHome = false, noindex = false }) {
  const pageTitle = title ? `${title} — ${site.name}` : `${site.shortName} — Design & direção de arte`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f7f6f2">
<title>${escape(pageTitle)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(pageTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="icon" href="${asset(base, 'favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${asset(base, 'styles.css')}"><script src="${asset(base, 'app.js')}" defer></script></head>
<body id="inicio" data-base="${escape(base)}"><a class="skip-link" href="#conteudo">Pular para o conteúdo</a>${header(base, isHome)}<main id="conteudo">${body}</main>${footer(base)}</body></html>`;
}

function projectCard(project, base, index) {
  const badge = project.status === 'demo' ? '<span class="context-label">Estudo conceitual</span>' : project.status === 'placeholder' ? '<span class="context-label">Em breve</span>' : '';
  return `<article class="project-card${index === 0 ? ' project-card-featured' : ''}" data-category="${escape(project.category)}"><a class="project-link" href="${projectLink(base, project)}" aria-label="Ver trabalho: ${escape(project.title)}"><div class="project-image">${project.image ? `<img src="${asset(base, project.image)}" alt="${escape(project.alt)}" width="1600" height="1100" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : `<div class="project-placeholder"><span>${escape(project.title)}</span><span>Em breve</span></div>`}<span class="project-open" aria-hidden="true">↗</span></div><div class="project-caption"><div><span class="project-number">${number(index)}</span><h3>${escape(project.title)}</h3></div><span class="project-category">${escape(project.category)}</span></div><div class="project-summary"><p>${escape(project.subtitle)}</p>${badge}</div></a></article>`;
}

function experienceRow(item) {
  return `<article class="experience-row"><div><h3>${escape(item.company)}</h3><p class="experience-location">${escape(item.location)}</p></div><div><p class="experience-role">${escape(item.role)}</p><p class="experience-description">${escape(item.bullets?.[0] || item.focus)}</p></div></article>`;
}

export function home(base = '/') {
  const experiences = resume.experiences || [];
  return layout({ base, isHome: true, body: `
    <section class="hero wrap" aria-labelledby="hero-title"><div class="hero-heading"><p class="eyebrow">Ícaro Braga / Portfólio</p><h1 id="hero-title">Ideias claras.<br>Imagens que ficam<span class="brand-dot">.</span></h1></div><div class="hero-aside"><p>Design, direção de arte,<br>fotografia &amp; audiovisual.</p><a class="text-link" href="#projetos">Conheça meu trabalho <span aria-hidden="true">↓</span></a></div></section>
    <section id="projetos" class="work-section wrap" aria-labelledby="work-title"><div class="section-label"><h2 id="work-title">01 / Trabalhos selecionados</h2><span>${String(projects.length).padStart(2, '0')} projetos</span></div><div class="project-grid">${projects.map((project, index) => projectCard(project, base, index)).join('')}</div></section>
    <section id="sobre" class="about-section wrap" aria-labelledby="about-title"><div class="section-label"><h2 id="about-title">02 / Quem sou eu</h2><span>${escape(site.location)}</span></div><div class="about-grid"><div class="about-heading"><h3>Prazer,<br>sou Ícaro<span class="brand-dot">.</span></h3><span class="about-experience">${escape(site.experienceYears)} de experiência</span></div><div class="about-copy"><p class="about-intro">Sou designer gráfico e visual. Conecto conceito e execução para dar forma a marcas, histórias e experiências.</p><p>${escape(profile.summary)}</p><ul class="discipline-list">${profile.pillars.map((item) => `<li>${escape(item.title)}</li>`).join('')}</ul></div></div></section>
    <section id="experiencia" class="experience-section wrap" aria-labelledby="experience-title"><div class="section-label"><h2 id="experience-title">03 / Experiência profissional</h2><span>Trajetória &amp; colaboração</span></div><div class="experience-list">${experiences.slice(0, 5).map(experienceRow).join('')}</div>${experiences.length > 5 ? `<details class="more-experience"><summary>Ver mais experiências <span aria-hidden="true">+</span></summary><div class="experience-list">${experiences.slice(5).map(experienceRow).join('')}</div></details>` : ''}</section>` });
}

export function casePage(project, base = '/') {
  const index = projects.findIndex((item) => item.slug === project.slug);
  const next = projects.length > 1 ? projects[(Math.max(index, 0) + 1) % projects.length] : null;
  const demo = project.status === 'demo';
  const placeholder = project.status === 'placeholder';
  const context = demo ? 'CASE DEMONSTRATIVO' : placeholder ? 'ESPAÇO RESERVADO' : 'TRABALHO SELECIONADO';
  const story = [['O desafio', project.challenge], ['O conceito', project.concept], ['A solução', project.solution]].filter(([, text]) => text);
  const gallery = project.gallery || [];
  return layout({ base, title: project.title, description: project.intro, body: `<section class="case-header wrap"><a class="text-link back-link" href="${base}#projetos">← Todos os trabalhos</a><div class="case-kicker"><span>${escape(project.category)}</span><span>${context}</span></div><h1>${escape(project.title)}<span class="brand-dot">.</span></h1><p class="case-subtitle">${escape(project.subtitle)}</p><div class="case-meta"><div><span>Atuação</span><p>${escape((project.services || []).join(' / ') || 'A definir')}</p></div><div><span>Contexto</span><p>${demo ? 'Estudo autoral fictício' : placeholder ? 'Aguardando conteúdo real' : escape(project.year || 'Projeto de portfólio')}</p></div></div></section>
    <div class="case-body">${project.image ? `<figure class="case-cover wrap"><img src="${asset(base, project.image)}" width="1600" height="1100" alt="${escape(project.alt)}" fetchpriority="high"><figcaption>${escape(project.title)}${demo ? ' / Exploração visual demonstrativa' : ''}</figcaption></figure>` : ''}<div class="wrap"><section class="case-intro"><h2>Sobre o projeto</h2><p>${escape(project.intro)}</p></section><div class="case-story">${story.map(([label, text], i) => `<section><h2><span>${number(i)}</span> ${label}</h2><p>${escape(text)}</p></section>`).join('')}</div></div>${gallery.length ? `<div class="case-gallery wrap">${gallery.map((item) => `<figure><img src="${asset(base, item.image)}" alt="${escape(item.alt)}" loading="lazy" decoding="async" width="1600" height="1100">${item.caption ? `<figcaption>${escape(item.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}<div class="wrap">${project.deliverables?.length ? `<section class="case-deliverables"><h2>Entregas</h2><ul>${project.deliverables.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></section>` : ''}${project.note ? `<aside class="case-note"><p>${escape(project.note)}</p></aside>` : ''}${next ? `<a class="next-project" href="${projectLink(base, next)}"><span>Próximo trabalho</span><strong>${escape(next.title)}</strong><span aria-hidden="true">↗</span></a>` : `<a class="next-project" href="${base}#projetos"><strong>Todos os trabalhos</strong><span aria-hidden="true">↗</span></a>`}</div></div>` });
}

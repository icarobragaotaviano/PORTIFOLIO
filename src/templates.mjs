import { site, projects } from './content.mjs';

export const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const normalizeBase = (base = '/') => {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('BASE_PATH deve ser / ou /nome-do-repositorio/');
  return base;
};
export const asset = (base, path) => `${base}${path.replace(/^\//, '')}`;
const arrow = '<span aria-hidden="true">↗</span>';
const linkToProject = (base, project) => asset(base, `projetos/${project.slug}/`);
const demoCount = String(projects.filter((project) => project.status === 'demo').length).padStart(2, '0');

function header(base, isHome) {
  return `<header class="site-header wrap">
    <a class="wordmark" href="${base}" aria-label="${escape(site.name)} — início">
      <span class="brand-mark-wrap">
        <img src="${asset(base, 'images/logo.svg')}" width="26" height="36" alt="" class="brand-symbol" aria-hidden="true">
      </span>
      <span class="wordmark-titles">
        <span class="wordmark-name">${escape(site.wordmark.primary)}<span class="wordmark-dot">.</span></span>
        <span class="wordmark-sub">${escape(site.wordmark.secondary)}</span>
      </span>
    </a>
    <p class="header-caption">Ideias com intenção.<br>Design com personalidade.</p>
    <button class="menu-toggle" aria-controls="navigation" aria-expanded="false" hidden>Menu <span aria-hidden="true">+</span></button>
    <nav id="navigation" aria-label="Navegação principal"><a href="${isHome ? '' : base}#projetos">Projetos <span>${demoCount}</span></a><a href="${isHome ? '' : base}#sobre">Sobre</a><a class="nav-contact" href="#contato">Contato ${arrow}</a></nav>
  </header>`;
}

function footer(base) {
  const contact = site.email ? `mailto:${escape(site.email)}` : escape(site.github);
  return `<footer id="contato" class="contact-section">
    <div class="wrap"><div class="section-eyebrow"><span>03 // PRÓXIMO CAPÍTULO</span><span>UMA BOA IDEIA COMEÇA COM UMA CONVERSA</span></div>
    <a class="contact-title" href="${contact}">
      <span class="contact-cta">Vamos criar<br><i>o próximo.</i></span>
      <span class="contact-symbol-box">
        <img src="${asset(base, 'images/logo.svg')}" width="52" height="72" alt="" class="contact-symbol" aria-hidden="true">
        <span class="contact-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
    <div class="contact-bottom"><span>${site.email ? escape(site.email) : 'Encontre-me no GitHub'} ${arrow}</span><a href="${escape(site.github)}">GitHub ${arrow}</a><a href="#inicio">Voltar ao topo ↑</a></div>
    <div class="footer-meta"><span>${escape(site.initials)} / © ${new Date().getFullYear()} ${escape(site.name)}.</span><span>Feito de ideias. E de detalhes.</span><span>Cases demonstrativos / edição 01</span></div></div>
  </footer>`;
}

export function layout({ base = '/', title, description = site.description, body, isHome = false, noindex = false }) {
  const pageTitle = title ? `${title} — ${site.name}` : `${site.name} — ${site.role}`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#010101">
<title>${escape(pageTitle)}</title><meta name="description" content="${escape(description)}"><meta property="og:title" content="${escape(pageTitle)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="icon" href="${asset(base, 'favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${asset(base, 'styles.css')}"><script src="${asset(base, 'app.js')}" defer></script></head>
<body id="inicio"><a class="skip-link" href="#conteudo">Pular para o conteúdo</a>${header(base, isHome)}<main id="conteudo">${body}</main>${footer(base)}</body></html>`;
}

function projectCard(project, base) {
  const placeholder = project.status === 'placeholder';
  return `<article class="project-card ${placeholder ? 'placeholder-card' : ''}" data-category="${escape(project.category)}">
    <a class="project-link" href="${linkToProject(base, project)}" aria-label="${placeholder ? 'Ver espaço reservado' : 'Explorar case demonstrativo'}: ${escape(project.title)}">
      <div class="project-image">${placeholder ? `<div class="wine-art"><span class="wine-small">UM NOVO CAPÍTULO</span><span class="wine-word">Wine<br><i>Gourmet.</i></span><span class="wine-mark" aria-hidden="true">W<span>G</span></span><span class="wine-label">ESPAÇO RESERVADO // EM BREVE</span></div>` : `<img src="${asset(base, project.image)}" alt="${escape(project.alt)}" width="1600" height="1200" loading="lazy" decoding="async">`}
      <span class="project-view" aria-hidden="true">${placeholder ? 'Ver detalhes' : 'Explorar case'} ↗</span></div>
      <div class="project-caption"><div><span class="project-number">/${project.number}</span><h3>${escape(project.title)}</h3></div><span class="project-category">${escape(project.category)} ${arrow}</span></div>
      <div class="project-description"><p>${escape(project.subtitle)}</p><span class="demo-label">${placeholder ? 'Projeto a adicionar' : 'Case demonstrativo'}</span></div>
    </a></article>`;
}

export function home(base) {
  return layout({ base, isHome: true, body: `
    <section class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-top"><span class="eyebrow">PORTFÓLIO // ${escape(site.role.toUpperCase())}</span><span class="hero-edition">VOL. 01 — EXPERIMENTOS VISUAIS</span></div>
      <div class="hero-composition"><h1 id="hero-title">O olhar<br>muda <i>tudo.</i></h1><div class="hero-object"><img src="${asset(base, 'images/hero-orbit.svg')}" width="1200" height="1200" alt="Escultura gráfica abstrata de aro metálico com acentos em ouro solar" fetchpriority="high"><span class="object-caption">FIG. 01 — MUDAR A PERSPECTIVA</span></div><span class="hero-asterisk" aria-hidden="true">✳</span></div>
      <div class="hero-bottom"><p>Estratégia na ideia.<br>Liberdade na forma.<br><span>Design para sair do lugar-comum.</span></p><a class="round-link" href="#projetos"><span>Explore os projetos</span><span class="round-arrow" aria-hidden="true">↓</span></a><span class="hero-index">SCROLL PARA DESCOBRIR<br>↓</span></div>
    </section>
    <div class="discipline-strip" aria-label="Áreas criativas"><span>DIREÇÃO DE ARTE</span><b aria-hidden="true">✳</b><span>IDENTIDADE VISUAL</span><b aria-hidden="true">✳</b><span>CONCEITO & CAMPANHA</span><b aria-hidden="true">✳</b><span>DESIGN EDITORIAL</span><b aria-hidden="true">✳</b></div>
    <section id="projetos" class="work-section"><div class="wrap"><div class="section-eyebrow"><span>01 // SELEÇÃO DE PROJETOS</span><span>IDEIA → FORMA → EXPRESSÃO</span></div>
      <div class="section-heading"><h2>Explorar.<br><i>Experimentar.</i></h2><p>Três universos visuais.<br>Três maneiras de provocar um novo olhar.<br><span>Estudos conceituais, sem vínculo comercial.</span></p></div>
      <div class="filter-bar" hidden><div class="filters" role="group" aria-label="Filtrar projetos">${['Todos', 'Branding', 'Campanha', 'Editorial'].map((filter, i) => `<button type="button" data-filter="${filter}" aria-pressed="${i === 0}">${filter}${i === 0 ? `<span>${demoCount}</span>` : ''}</button>`).join('')}</div><span class="filter-note">CURADORIA INDEPENDENTE // 2026</span></div>
      <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p><div class="project-grid">${projects.map((project) => projectCard(project, base)).join('')}</div>
      <div class="work-footnote"><span>✳</span><p>Este é um espaço de experimentação. Vértice, Casa Sol e Entrelinhas são cases demonstrativos. WineGourmet está reservado para um projeto futuro.</p></div>
    </div></section>
    <section id="sobre" class="about-section wrap"><div class="section-eyebrow"><span>02 // POR TRÁS DO OLHAR</span><span>${escape(site.name).toUpperCase()}</span></div>
      <div class="about-grid"><div class="about-side"><img src="${asset(base, 'images/logo.svg')}" width="54" height="75" alt="Monograma IB" class="about-symbol-mark"><p>A forma chama.<br>A ideia fica.</p><span class="eyebrow">DIREÇÃO DE ARTE<br>& DESIGN</span></div><div class="about-content"><h2>Menos previsível.<br>Mais <i>memorável.</i></h2><p class="about-intro">Um ponto de vista sobre design: encontrar a tensão entre clareza e surpresa. Transformar conceitos em identidades, campanhas e experiências que merecem um segundo olhar.</p><p class="about-note">Aqui, cada estudo explora uma possibilidade — do primeiro conceito ao último detalhe visual.</p>
      <div class="process" aria-label="Abordagem criativa"><details open><summary><span>01</span>Pensar antes de desenhar<span class="details-icon" aria-hidden="true">+</span></summary><p>Contexto, repertório e uma pergunta bem formulada. O conceito define o que a imagem precisa dizer.</p></details><details><summary><span>02</span>Encontrar uma linguagem<span class="details-icon" aria-hidden="true">+</span></summary><p>Tipografia, cor e composição trabalham juntas. Explorar contrastes até chegar a um sistema com personalidade.</p></details><details><summary><span>03</span>Cuidar de cada ponto de contato<span class="details-icon" aria-hidden="true">+</span></summary><p>Da peça principal aos pequenos formatos: manter o conceito reconhecível, com consistência e espaço para surpreender.</p></details></div></div></div>
    </section>` });
}

export function casePage(project, base) {
  const placeholder = project.status === 'placeholder';
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return layout({ base, title: project.title, description: project.intro, body: `<section class="case-header wrap"><a class="text-link" href="${base}#projetos">← Todos os projetos</a><div class="case-kicker"><span>/${project.number} — ${escape(project.category)}</span><span class="case-badge">${placeholder ? 'ESPAÇO RESERVADO' : 'CASE DEMONSTRATIVO'}</span></div><h1>${escape(project.title)}<span class="accent">.</span></h1><p class="case-subtitle">${escape(project.subtitle)}</p><div class="case-meta"><div><span>NATUREZA</span><p>${placeholder ? 'Projeto a adicionar' : 'Estudo autoral fictício'}</p></div><div><span>DISCIPLINAS PROPOSTAS</span><p>${escape(project.services.join(' / ') || 'A definir')}</p></div><div><span>STATUS</span><p>${placeholder ? 'Aguardando conteúdo real' : 'Exploração conceitual'}</p></div></div></section>
    <section class="case-body">${placeholder ? `<div class="case-placeholder wrap"><span aria-hidden="true">↗</span><h2>Boas histórias<br>merecem <i>seu tempo.</i></h2><p>WineGourmet tem um lugar reservado aqui. O case será adicionado quando os materiais, o escopo e os créditos estiverem disponíveis.</p><p class="demo-label">Nenhum trabalho realizado ou resultado é atribuído neste espaço.</p></div>` : `<figure class="case-cover"><img src="${asset(base, project.image)}" width="1600" height="1200" alt="${escape(project.alt)}"><figcaption>${escape(project.title)} / Exploração visual demonstrativa</figcaption></figure>`}
      <div class="wrap"><div class="case-intro"><span class="eyebrow">${placeholder ? 'O PRÓXIMO PASSO' : 'A IDEIA EM POUCAS PALAVRAS'}</span><h2>${escape(project.intro)}</h2></div><div class="case-story">${[['01 / O DESAFIO', project.challenge], ['02 / O CONCEITO', project.concept], ['03 / A EXPRESSÃO', project.solution]].map(([label, text]) => `<section><h3>${label}</h3><p>${escape(text)}</p></section>`).join('')}</div>
      ${placeholder ? '' : `<div class="case-detail" style="--case-accent:${escape(project.accent)}"><div class="detail-type"><span>TIPO / COR / ATITUDE</span><strong>${project.slug === 'vertice' ? 'Vv' : project.slug === 'casa-sol' ? 'Sol.' : 'Aa'}</strong><span>${escape(project.title)} — SISTEMA VISUAL</span></div><div class="detail-list"><h3>Uma ideia.<br>Muitas possibilidades.</h3><ul>${project.deliverables.map((item) => `<li>${escape(item)} <span aria-hidden="true">↗</span></li>`).join('')}</ul><p>Aplicações propostas neste estudo conceitual.</p></div></div>`}
      <aside class="case-disclaimer"><span aria-hidden="true">✳</span><p>${escape(project.note)}</p></aside><a class="next-project" href="${linkToProject(base, next)}"><span>PRÓXIMO ${next.status === 'placeholder' ? 'CAPÍTULO' : 'CASE'}</span><strong>${escape(next.title)}</strong><span aria-hidden="true">↗</span></a></div></section>` });
}


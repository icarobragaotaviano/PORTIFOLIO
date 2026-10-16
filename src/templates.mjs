import {
  site,
  projects,
  motionProjects,
  aiCreations,
  profile,
  resume,
  blogPosts,
  socials,
} from './content.mjs';

export const escape = (value = '') =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export const normalizeBase = (base = '/') => {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('BASE_PATH deve ser / ou /nome-do-repositorio/');
  return base;
};

export const asset = (base, path) => `${base}${path.replace(/^\//, '')}`;
const arrow = '<span aria-hidden="true">↗</span>';
const linkToProject = (base, project) => asset(base, `projetos/${project.slug}/`);
const demoCount = String(projects.filter((project) => project.status === 'demo').length).padStart(2, '0');

function header(base, isHome) {
  const prefix = isHome ? '' : base;
  return `<header class="site-header wrap">
    <a class="wordmark" href="${base}" aria-label="${escape(site.name)} — início">
      <span class="wordmark-titles">
        <span class="wordmark-name">${escape(site.wordmark.primary)}<span class="wordmark-dot">.</span></span>
        <span class="wordmark-sub">${escape(site.wordmark.secondary)}</span>
      </span>
    </a>
    <div class="header-section-tracker" id="header-section-tracker" aria-live="polite">
      <span class="tracker-prefix">//</span>
      <span class="tracker-number" id="tracker-number">00</span>
      <span class="tracker-title" id="tracker-title">INÍCIO</span>
    </div>
    <p class="header-caption">Fortaleza, Ceará, BR<br>+10 anos em Design &amp; Audiovisual</p>
    <button class="menu-toggle" aria-controls="navigation" aria-expanded="false" hidden>Menu <span aria-hidden="true">+</span></button>
    <nav id="navigation" aria-label="Navegação principal">
      <a href="${prefix}#projetos">Projetos <span>${demoCount}</span></a>
      <a href="${prefix}#motion">Motion</a>
      <a href="${prefix}#criacoes-ia">IA</a>
      <a href="${prefix}#sobre">Quem sou eu</a>
      <a href="${prefix}#curriculo">Currículo</a>
      <a href="${prefix}#blog">Blog</a>
      <a href="${prefix}#redes-sociais">Redes</a>
      <a class="nav-contact" href="#contato">Contato ${arrow}</a>
    </nav>
  </header>`;
}

function footer() {
  const contactHref = site.email ? `mailto:${escape(site.email)}` : escape(site.github);
  return `<footer id="contato" class="contact-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>07 // CONTATOS &amp; PRÓXIMO CAPÍTULO</span>
        <span>DISPONIBILIDADE INTEGRAL // ${escape(site.location.toUpperCase())}</span>
      </div>
      <a class="contact-title" href="${contactHref}">
        <span class="contact-cta">Vamos criar<br><i>o próximo.</i></span>
        <span class="contact-symbol-box">
          <span class="contact-arrow" aria-hidden="true">↗</span>
        </span>
      </a>
      <div class="contact-cards-grid" aria-label="Canais de contato direto">
        <a class="contact-channel-card" href="${escape(site.phoneHref)}">
          <span class="channel-kicker">TELEFONE &amp; LIGAÇÃO</span>
          <strong>${escape(site.phone)}</strong>
          <span class="channel-action">Ligar agora ${arrow}</span>
        </a>
        <a class="contact-channel-card" href="${escape(site.whatsapp)}" target="_blank" rel="noopener noreferrer">
          <span class="channel-kicker">WHATSAPP DIRETO</span>
          <strong>${escape(site.phone)}</strong>
          <span class="channel-action">Iniciar conversa ${arrow}</span>
        </a>
        <a class="contact-channel-card" href="mailto:${escape(site.email)}">
          <span class="channel-kicker">E-MAIL PROFISSIONAL</span>
          <strong>${escape(site.email)}</strong>
          <span class="channel-action">Enviar mensagem ${arrow}</span>
        </a>
        <div class="contact-channel-card contact-location-card">
          <span class="channel-kicker">LOCALIZAÇÃO &amp; ATUAÇÃO</span>
          <strong>${escape(site.location)}</strong>
          <span class="channel-action">Presencial &amp; Remoto // Brasil</span>
        </div>
      </div>
      <div class="contact-bottom">
        <span>${escape(site.name)} — ${escape(site.email)} ${arrow}</span>
        <a href="${escape(site.whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp ${arrow}</a>
        <a href="${escape(site.github)}" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a>
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>
      <div class="footer-meta">
        <span>${escape(site.initials)} / © ${new Date().getFullYear()} ${escape(site.name)}.</span>
        <span>Design Gráfico, Fotografia, Motion &amp; IA — ${escape(site.location)}</span>
        <span>Portfólio &amp; Currículo Profissional • <button type="button" class="owner-lock-btn" id="owner-access-btn" title="Acesso exclusivo do proprietário (Ctrl+Shift+E)">🔒 Área do Proprietário</button></span>
      </div>
    </div>
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
<body id="inicio" data-base="${escape(base)}"><a class="skip-link" href="#conteudo">Pular para o conteúdo</a>${header(base, isHome)}<main id="conteudo">${body}</main>${footer()}</body></html>`;
}

function projectCard(project, base) {
  const placeholder = project.status === 'placeholder';
  return `<article class="project-card ${placeholder ? 'placeholder-card' : ''}" data-category="${escape(project.category)}">
    <a class="project-link" href="${linkToProject(base, project)}" aria-label="${placeholder ? 'Ver espaço reservado' : 'Explorar case demonstrativo'}: ${escape(project.title)}">
      <div class="project-image">${placeholder ? `<div class="wine-art"><span class="wine-small">UM NOVO CAPÍTULO</span><span class="wine-word">Wine<br><i>Gourmet.</i></span><span class="wine-mark" aria-hidden="true">W<span>G</span></span><span class="wine-label">ESPAÇO RESERVADO // EM BREVE</span></div>` : `<img src="${asset(base, project.image)}" alt="${escape(project.alt)}" data-edit-img="project-${escape(project.slug)}" width="1600" height="1200" loading="lazy" decoding="async">`}
      <span class="project-view" aria-hidden="true">${placeholder ? 'Ver detalhes' : 'Explorar case'} ↗</span></div>
      <div class="project-caption"><div><span class="project-number">/${project.number}</span><h3>${escape(project.title)}</h3></div><span class="project-category">${escape(project.category)} ${arrow}</span></div>
      <div class="project-description"><p>${escape(project.subtitle)}</p><span class="demo-label">${placeholder ? 'Projeto a adicionar' : 'Case demonstrativo'}</span></div>
    </a></article>`;
}

function motionSection(base) {
  return `<section id="motion" class="motion-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>02 // MOTION DESIGN &amp; AUDIOVISUAL</span>
        <span>RITMO → TIMELINE → IMPACTO EM MOVIMENTO</span>
      </div>
      <div class="section-heading">
        <h2>Design em<br><i>movimento.</i></h2>
        <p>Animação gráfica, direção de transmissão ao vivo e produção audiovisual completa.<br><span>After Effects // Premiere Pro // CapCut // Direção de Cena</span></p>
      </div>
      <div class="motion-grid">
        ${motionProjects
          .map(
            (item) => `<article class="motion-card">
          <div class="motion-preview">
            <img src="${asset(base, item.image)}" alt="${escape(item.alt)}" data-edit-img="motion-${escape(item.number)}" width="1200" height="800" loading="lazy" decoding="async">
            <span class="motion-badge"><span class="motion-rec-dot" aria-hidden="true"></span>${escape(item.duration)}</span>
          </div>
          <div class="motion-body">
            <div class="motion-meta">
              <span class="motion-number">/${escape(item.number)}</span>
              <span class="motion-category">${escape(item.category)}</span>
            </div>
            <h3>${escape(item.title)}</h3>
            <p>${escape(item.description)}</p>
            <div class="motion-tags" aria-label="Ferramentas e entregas">
              ${item.tools.map((t) => `<span class="tag-pill tag-accent">${escape(t)}</span>`).join('')}
              ${item.deliverables.map((d) => `<span class="tag-pill">${escape(d)}</span>`).join('')}
            </div>
          </div>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function aiSection(base) {
  return `<section id="criacoes-ia" class="ai-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>03 // CRIAÇÕES COM IA</span>
        <span>DIREÇÃO DE ARTE GENERATIVA &amp; FLUXO HÍBRIDO</span>
      </div>
      <div class="section-heading">
        <h2>Imaginação<br><i>amplificada.</i></h2>
        <p>Inteligência Artificial guiada por mais de uma década de repertório em fotografia, iluminação e design.<br><span>Conceito humano + Síntese generativa + Acabamento profissional</span></p>
      </div>
      <div class="ai-pipeline" aria-label="Fluxo criativo com Inteligência Artificial">
        <div class="pipeline-step"><span>01 // INTENÇÃO</span><strong>Briefing &amp; Direção</strong><p>Definição de conceito, atmosfera, lente e paleta cromática antes do prompt.</p></div>
        <div class="pipeline-step"><span>02 // SÍNTESE</span><strong>Geração &amp; Iteração</strong><p>Exploração controlada de variações visuais, texturas e cenários complexos.</p></div>
        <div class="pipeline-step"><span>03 // CURADORIA</span><strong>Fusão &amp; Retoque Pro</strong><p>Pós-produção no Photoshop e Affinity Photo para precisão estética e editorial.</p></div>
      </div>
      <div class="ai-grid">
        ${aiCreations
          .map(
            (item) => `<article class="ai-card">
          <div class="ai-image-wrap">
            <img src="${asset(base, item.image)}" alt="${escape(item.alt)}" data-edit-img="ai-${escape(item.number)}" width="1200" height="800" loading="lazy" decoding="async">
            <span class="ai-tag">${escape(item.tag)}</span>
          </div>
          <div class="ai-card-content">
            <div class="ai-prompt-bar">
              <span class="ai-number">/${escape(item.number)}</span>
              <code>${escape(item.promptSpec)}</code>
            </div>
            <h3>${escape(item.title)}</h3>
            <p>${escape(item.description)}</p>
            <ul class="ai-highlights">
              ${item.highlights.map((h) => `<li><span aria-hidden="true">✳</span> ${escape(h)}</li>`).join('')}
            </ul>
          </div>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function aboutSection(base) {
  return `<section id="sobre" class="about-section wrap">
    <div class="section-eyebrow">
      <span>04 // QUEM SOU EU</span>
      <span>${escape(site.name).toUpperCase()} — ${escape(site.location.toUpperCase())}</span>
    </div>
    <div class="about-grid">
      <div class="about-side">
        <figure class="profile-photo-frame">
          <div class="profile-photo-wrap">
            <img src="${asset(base, 'images/profile-placeholder.svg')}" width="800" height="1000" alt="Foto de perfil de ${escape(site.name)}" class="profile-photo-img" id="owner-profile-photo" data-edit-img="profile-photo">
          </div>
          <figcaption class="profile-photo-caption">
            <span>RETRATO // ${escape(site.initials)}</span>
            <span>${escape(site.location.toUpperCase())}</span>
          </figcaption>
        </figure>
        <div class="about-brand-signature">
          <img src="${asset(base, 'images/logo.svg')}" width="42" height="58" alt="Monograma IB" class="about-symbol-mark">
          <div>
            <p>A forma chama.<br>A ideia fica.</p>
            <span class="eyebrow">DESIGN GRÁFICO, FOTOGRAFIA<br>&amp; PRODUÇÃO AUDIOVISUAL</span>
          </div>
        </div>
        <div class="about-quick-facts">
          <div><span>EXPERIÊNCIA</span><strong>${escape(site.experienceYears)}</strong></div>
          <div><span>LOCALIZAÇÃO</span><strong>${escape(site.location)}</strong></div>
          <div><span>DISPONIBILIDADE</span><strong>${escape(site.availability)}</strong></div>
          <div><span>IDIOMAS</span><strong>PT Nativo / EN Fluente</strong></div>
        </div>
      </div>
      <div class="about-content">
        <h2>Quem sou <i>eu.</i></h2>
        <p class="about-lead">${escape(profile.headline)}</p>
        <p class="about-intro">${escape(profile.summary)}</p>
        <div class="about-pillars">
          ${profile.pillars
            .map(
              (pillar) => `<div class="pillar-card">
            <span class="pillar-num">/${escape(pillar.number)}</span>
            <h3>${escape(pillar.title)}</h3>
            <p>${escape(pillar.text)}</p>
          </div>`
            )
            .join('')}
        </div>
        <div class="about-exp-strip" aria-label="Resumo de atuação profissional">
          <span class="eyebrow">ATUAÇÃO &amp; EXPERIÊNCIAS EM DESTAQUE // <a href="#curriculo">VER CURRÍCULO COMPLETO ↓</a></span>
          <div class="motion-tags">
            ${resume.experiences.map((exp) => `<a href="#curriculo" class="tag-pill tag-accent">${escape(exp.company)} (${escape(exp.location)})</a>`).join('')}
          </div>
        </div>
        <div class="process" aria-label="Abordagem criativa">
          <details open>
            <summary><span>01</span>Pensar antes de desenhar<span class="details-icon" aria-hidden="true">+</span></summary>
            <p>Contexto, repertório e uma pergunta bem formulada. O conceito define o que a imagem, o vídeo ou a peça gráfica precisa comunicar em saúde, educação e eventos.</p>
          </details>
          <details>
            <summary><span>02</span>Encontrar uma linguagem própria<span class="details-icon" aria-hidden="true">+</span></summary>
            <p>Tipografia, cor, iluminação fotográfica e movimento trabalham juntos. Explorar contrastes até chegar a um sistema visual consistente e memorável.</p>
          </details>
          <details>
            <summary><span>03</span>Cuidar de cada ponto de contato<span class="details-icon" aria-hidden="true">+</span></summary>
            <p>Da arte final para impressão em pequenas e grandes tiragens à direção ao vivo de transmissões digitais: rigor técnico do início à entrega.</p>
          </details>
        </div>
      </div>
    </div>
  </section>`;
}

function resumeSection() {
  return `<section id="curriculo" class="resume-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>05 // CURRÍCULO PROFISSIONAL</span>
        <span>TRAJETÓRIA, COMPETÊNCIAS &amp; FORMAÇÃO</span>
      </div>
      <div class="resume-header-banner">
        <div>
          <span class="eyebrow">CURRÍCULO DESIGNER // TRAJETÓRIA VERIFICADA (${resume.experiences.length} EXPERIÊNCIAS)</span>
          <h2>${escape(site.name)}</h2>
          <p class="resume-meta-line">
            <span><strong>Telefone:</strong> <a href="${escape(site.phoneHref)}">${escape(site.phone)}</a></span>
            <span>•</span>
            <span><strong>E-mail:</strong> <a href="mailto:${escape(site.email)}">${escape(site.email)}</a></span>
            <span>•</span>
            <span><strong>Localização:</strong> ${escape(site.location)}</span>
          </p>
        </div>
        <div class="resume-actions">
          <a class="btn-resume-primary" href="${escape(site.whatsapp)}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp ${arrow}</a>
          <button type="button" class="btn-resume-print" id="print-resume-btn">Imprimir / Salvar PDF 🖨</button>
        </div>
      </div>

      <div class="resume-block">
        <h3 class="resume-block-title"><span>01 //</span> Experiência Profissional</h3>
        <div class="experience-list">
          ${resume.experiences
            .map(
              (exp, index) => `<article class="experience-card">
            <div class="exp-left">
              <span class="exp-index">EXP // ${String(index + 1).padStart(2, '0')}</span>
              <h4>${escape(exp.role)}</h4>
              <strong class="exp-company">${escape(exp.company)}</strong>
              <span class="exp-location">${escape(exp.location)}</span>
              <span class="exp-focus">${escape(exp.focus)}</span>
            </div>
            <ul class="exp-bullets">
              ${exp.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}
            </ul>
          </article>`
            )
            .join('')}
        </div>
      </div>

      <div class="resume-block">
        <h3 class="resume-block-title"><span>02 //</span> Competências Técnicas</h3>
        <div class="skills-grid">
          ${resume.technicalSkills
            .map(
              (group) => `<div class="skill-card">
            <h4>${escape(group.category)}</h4>
            <ul>
              ${group.items.map((item) => `<li>${escape(item)}</li>`).join('')}
            </ul>
          </div>`
            )
            .join('')}
        </div>
      </div>

      <div class="resume-columns">
        <div class="resume-subblock">
          <h3 class="resume-block-title"><span>03 //</span> Competências Comportamentais</h3>
          <ul class="resume-check-list">
            ${resume.behavioralSkills.map((item) => `<li><span aria-hidden="true">✳</span> ${escape(item)}</li>`).join('')}
          </ul>
          <h3 class="resume-block-title resume-mt"><span>04 //</span> Idiomas &amp; Informações Adicionais</h3>
          <div class="languages-row">
            ${resume.languages
              .map(
                (lang) => `<div class="lang-badge"><strong>${escape(lang.name)}</strong><span>${escape(lang.level)}</span></div>`
              )
              .join('')}
          </div>
          <ul class="resume-check-list resume-mt-sm">
            ${resume.additionalInfo.map((info) => `<li><span aria-hidden="true">→</span> ${escape(info)}</li>`).join('')}
          </ul>
        </div>

        <div class="resume-subblock">
          <h3 class="resume-block-title"><span>05 //</span> Formação Acadêmica, Cursos &amp; Qualificações</h3>
          <div class="education-list">
            ${resume.education
              .map(
                (edu) => `<div class="edu-item">
              <span class="edu-year">FORMAÇÃO ACADÊMICA // ${escape(edu.year)}</span>
              <h4>${escape(edu.title)}</h4>
              <p>${escape(edu.institution)}</p>
            </div>`
              )
              .join('')}
            ${resume.courses
              .map(
                (course) => `<div class="edu-item">
              <span class="edu-year">QUALIFICAÇÃO // ${escape(course.year)}</span>
              <h4>${escape(course.title)} — ${escape(course.institution)}</h4>
              <p>${escape(course.description)}</p>
            </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function blogSection() {
  return `<section id="blog" class="blog-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>06 // BLOG &amp; ARTIGOS</span>
        <span>NOTAS SOBRE DESIGN, FOTOGRAFIA, MOTION &amp; IA</span>
      </div>
      <div class="section-heading">
        <h2>Reflexões &amp;<br><i>Repertório.</i></h2>
        <p>Artigos curtos sobre bastidores de projetos, sistemas de identidade visual, direção audiovisual e processos criativos.<br><span>Caderno editorial // Ícaro Braga</span></p>
      </div>
      <div class="blog-grid">
        ${blogPosts
          .map(
            (post, idx) => `<article class="blog-card">
          <div class="blog-card-top">
            <span class="blog-category">${escape(post.category)}</span>
            <span class="blog-date">${escape(post.date)} • ${escape(post.readTime)}</span>
          </div>
          <h3>${escape(post.title)}</h3>
          <p class="blog-excerpt">${escape(post.excerpt)}</p>
          <details class="blog-reader">
            <summary>Ler artigo completo <span aria-hidden="true">↗</span></summary>
            <div class="blog-full-text">
              <p>${escape(post.content)}</p>
              <span class="blog-signature">// Artigo #0${idx + 1} por ${escape(site.name)}</span>
            </div>
          </details>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function socialsSection() {
  return `<section id="redes-sociais" class="socials-section">
    <div class="wrap">
      <div class="section-eyebrow">
        <span>07 // REDES SOCIAIS &amp; CONEXÕES</span>
        <span>ACOMPANHE PROCESSOS, BASTIDORES E NOVOS PROJETOS</span>
      </div>
      <div class="section-heading">
        <h2>Presença<br><i>digital.</i></h2>
        <p>Conecte-se pelas redes sociais para acompanhar novos estudos visuais, projetos de motion, experimentos com IA e fotografia.<br><span>Canais oficiais // @icarobragaotaviano</span></p>
      </div>
      <div class="socials-grid">
        ${socials
          .map(
            (item) => `<a class="social-card" href="${escape(item.url)}" ${item.url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
          <div class="social-card-top">
            <span class="social-name">${escape(item.name)}</span>
            <span class="social-arrow" aria-hidden="true">↗</span>
          </div>
          <strong class="social-handle">${escape(item.handle)}</strong>
          <span class="social-label">${escape(item.label)}</span>
        </a>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

export function home(base) {
  return layout({
    base,
    isHome: true,
    body: `
    <aside class="scroll-ruler" id="scroll-ruler" aria-label="Régua de navegação e rolagem">
      <div class="ruler-track">
        <div class="ruler-ticks" aria-hidden="true"></div>
        <div class="ruler-indicator" id="ruler-indicator" aria-hidden="true">
          <span class="ruler-indicator-pct" id="ruler-pct">00%</span>
          <span class="ruler-indicator-needle"></span>
        </div>
        <nav class="ruler-sections" aria-label="Navegação por régua">
          <a href="#inicio" class="ruler-stop is-active" data-section="inicio" data-number="00" data-label="INÍCIO" title="00 // INÍCIO">
            <span class="ruler-stop-label">00 // INÍCIO</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#projetos" class="ruler-stop" data-section="projetos" data-number="01" data-label="PROJETOS" title="01 // PROJETOS">
            <span class="ruler-stop-label">01 // PROJETOS</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#motion" class="ruler-stop" data-section="motion" data-number="02" data-label="MOTION" title="02 // MOTION">
            <span class="ruler-stop-label">02 // MOTION</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#criacoes-ia" class="ruler-stop" data-section="criacoes-ia" data-number="03" data-label="CRIAÇÕES IA" title="03 // CRIAÇÕES IA">
            <span class="ruler-stop-label">03 // CRIAÇÕES IA</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#sobre" class="ruler-stop" data-section="sobre" data-number="04" data-label="QUEM SOU EU" title="04 // QUEM SOU EU">
            <span class="ruler-stop-label">04 // QUEM SOU EU</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#curriculo" class="ruler-stop" data-section="curriculo" data-number="05" data-label="CURRÍCULO" title="05 // CURRÍCULO">
            <span class="ruler-stop-label">05 // CURRÍCULO</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#blog" class="ruler-stop" data-section="blog" data-number="06" data-label="BLOG" title="06 // BLOG">
            <span class="ruler-stop-label">06 // BLOG</span>
            <span class="ruler-stop-pip"></span>
          </a>
          <a href="#contato" class="ruler-stop" data-section="contato" data-number="07" data-label="CONTATO" title="07 // CONTATO">
            <span class="ruler-stop-label">07 // CONTATO</span>
            <span class="ruler-stop-pip"></span>
          </a>
        </nav>
      </div>
    </aside>
    <section class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-top"><span class="eyebrow">PORTFÓLIO // ${escape(site.name.toUpperCase())}</span><span class="hero-edition">DESIGN • MOTION • IA • FOTOGRAFIA</span></div>
      <div class="hero-composition"><h1 id="hero-title">O olhar<br>muda <i>tudo.</i></h1></div>
      <div class="hero-bottom"><p>Mais de 10 anos em design gráfico, direção de arte, fotografia e produção audiovisual.<br><span>Projetos estratégicos em saúde, educação, eventos, motion e IA.</span></p><a class="round-link" href="#projetos"><span>Explore o portfólio</span><span class="round-arrow" aria-hidden="true">↓</span></a><span class="hero-index">${escape(site.location.toUpperCase())}<br>↓</span></div>
    </section>
    <div class="discipline-strip" aria-label="Áreas criativas"><span>DIREÇÃO DE ARTE</span><b aria-hidden="true">✳</b><span>IDENTIDADE VISUAL</span><b aria-hidden="true">✳</b><span>MOTION DESIGN</span><b aria-hidden="true">✳</b><span>CRIAÇÕES COM IA</span><b aria-hidden="true">✳</b><span>FOTOGRAFIA PRO</span><b aria-hidden="true">✳</b><span>PRODUÇÃO AUDIOVISUAL</span><b aria-hidden="true">✳</b></div>
    <section id="projetos" class="work-section"><div class="wrap"><div class="section-eyebrow"><span>01 // SELEÇÃO DE PROJETOS</span><span>IDEIA → FORMA → EXPRESSÃO</span></div>
      <div class="section-heading"><h2>Explorar.<br><i>Experimentar.</i></h2><p>Três universos visuais.<br>Três maneiras de provocar um novo olhar.<br><span>Estudos conceituais, sem vínculo comercial.</span></p></div>
      <div class="filter-bar" hidden><div class="filters" role="group" aria-label="Filtrar projetos">${['Todos', 'Branding', 'Campanha', 'Editorial'].map((filter, i) => `<button type="button" data-filter="${filter}" aria-pressed="${i === 0}">${filter}${i === 0 ? `<span>${demoCount}</span>` : ''}</button>`).join('')}</div><span class="filter-note">CURADORIA INDEPENDENTE // 2026</span></div>
      <p class="sr-only" id="filter-status" role="status" aria-live="polite"></p><div class="project-grid">${projects.map((project) => projectCard(project, base)).join('')}</div>
      <div class="work-footnote"><span>✳</span><p>Este é um espaço de experimentação. Vértice, Casa Sol e Entrelinhas são cases demonstrativos. WineGourmet está reservado para um projeto futuro.</p></div>
    </div></section>
    ${motionSection(base)}
    ${aiSection(base)}
    ${aboutSection(base)}
    ${resumeSection()}
    ${blogSection()}
    ${socialsSection()}`,
  });
}

export function casePage(project, base) {
  const placeholder = project.status === 'placeholder';
  const next = projects[(projects.indexOf(project) + 1) % projects.length];
  return layout({
    base,
    title: project.title,
    description: project.intro,
    body: `<section class="case-header wrap"><a class="text-link" href="${base}#projetos">← Todos os projetos</a><div class="case-kicker"><span>/${project.number} — ${escape(project.category)}</span><span class="case-badge">${placeholder ? 'ESPAÇO RESERVADO' : 'CASE DEMONSTRATIVO'}</span></div><h1>${escape(project.title)}<span class="accent">.</span></h1><p class="case-subtitle">${escape(project.subtitle)}</p><div class="case-meta"><div><span>NATUREZA</span><p>${placeholder ? 'Projeto a adicionar' : 'Estudo autoral fictício'}</p></div><div><span>DISCIPLINAS PROPOSTAS</span><p>${escape(project.services.join(' / ') || 'A definir')}</p></div><div><span>STATUS</span><p>${placeholder ? 'Aguardando conteúdo real' : 'Exploração conceitual'}</p></div></div></section>
    <section class="case-body">${placeholder ? `<div class="case-placeholder wrap"><span aria-hidden="true">↗</span><h2>Boas histórias<br>merecem <i>seu tempo.</i></h2><p>WineGourmet tem um lugar reservado aqui. O case será adicionado quando os materiais, o escopo e os créditos estiverem disponíveis.</p><p class="demo-label">Nenhum trabalho realizado ou resultado é atribuído neste espaço.</p></div>` : `<figure class="case-cover"><img src="${asset(base, project.image)}" width="1600" height="1200" alt="${escape(project.alt)}" data-edit-img="project-${escape(project.slug)}"><figcaption>${escape(project.title)} / Exploração visual demonstrativa</figcaption></figure>`}
      <div class="wrap"><div class="case-intro"><span class="eyebrow">${placeholder ? 'O PRÓXIMO PASSO' : 'A IDEIA EM POUCAS PALAVRAS'}</span><h2>${escape(project.intro)}</h2></div><div class="case-story">${[['01 / O DESAFIO', project.challenge], ['02 / O CONCEITO', project.concept], ['03 / A EXPRESSÃO', project.solution]].map(([label, text]) => `<section><h3>${label}</h3><p>${escape(text)}</p></section>`).join('')}</div>
      ${placeholder ? '' : `<div class="case-detail" style="--case-accent:${escape(project.accent)}"><div class="detail-type"><span>TIPO / COR / ATITUDE</span><strong>${project.slug === 'vertice' ? 'Vv' : project.slug === 'casa-sol' ? 'Sol.' : 'Aa'}</strong><span>${escape(project.title)} — SISTEMA VISUAL</span></div><div class="detail-list"><h3>Uma ideia.<br>Muitas possibilidades.</h3><ul>${project.deliverables.map((item) => `<li>${escape(item)} <span aria-hidden="true">↗</span></li>`).join('')}</ul><p>Aplicações propostas neste estudo conceitual.</p></div></div>`}
      <aside class="case-disclaimer"><span aria-hidden="true">✳</span><p>${escape(project.note)}</p></aside><a class="next-project" href="${linkToProject(base, next)}"><span>PRÓXIMO ${next.status === 'placeholder' ? 'CAPÍTULO' : 'CASE'}</span><strong>${escape(next.title)}</strong><span aria-hidden="true">↗</span></a></div></section>`,
  });
}

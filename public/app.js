// Progressive enhancement: content and navigation work without JavaScript.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (menuButton && navigation) {
  menuButton.hidden = false;
  document.documentElement.classList.add('has-menu');
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) closeMenu(); });
}

const filterBar = document.querySelector('.filter-bar');
if (filterBar) {
  filterBar.hidden = false;
  const buttons = [...filterBar.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-category]')];
  const status = document.querySelector('#filter-status');
  buttons.forEach((button) => button.addEventListener('click', () => {
    buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const filter = button.dataset.filter;
    cards.forEach((card) => { card.hidden = filter !== 'Todos' && card.dataset.category !== filter; });
    const count = cards.filter((card) => !card.hidden && card.dataset.category !== 'Em breve').length;
    status.textContent = `${count} ${count === 1 ? 'case demonstrativo exibido' : 'cases demonstrativos exibidos'}${filter === 'Todos' ? ' e um espaço reservado para WineGourmet' : ''}.`;
  }));
}

const printResumeBtn = document.querySelector('#print-resume-btn');
if (printResumeBtn) {
  printResumeBtn.addEventListener('click', () => {
    window.print();
  });
}

// Animate only when supported and explicitly allowed by the visitor.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.project-card, .motion-card, .ai-card, .about-content, .experience-card, .blog-card, .case-story section').forEach((element) => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}

// Régua de rolagem e rastreamento de seção animado para o topo
const ruler = document.querySelector('#scroll-ruler');
const rulerIndicator = document.querySelector('#ruler-indicator');
const rulerPct = document.querySelector('#ruler-pct');
const trackerNumber = document.querySelector('#tracker-number');
const trackerTitle = document.querySelector('#tracker-title');
const headerTracker = document.querySelector('#header-section-tracker');
const rulerStops = document.querySelectorAll('.ruler-stop');

if (ruler && rulerIndicator) {
  const sections = [
    { id: 'inicio', element: document.querySelector('.hero') || document.querySelector('#inicio'), number: '00', label: 'INÍCIO' },
    { id: 'projetos', element: document.querySelector('#projetos'), number: '01', label: 'PROJETOS' },
    { id: 'motion', element: document.querySelector('#motion'), number: '02', label: 'MOTION' },
    { id: 'criacoes-ia', element: document.querySelector('#criacoes-ia'), number: '03', label: 'CRIAÇÕES IA' },
    { id: 'sobre', element: document.querySelector('#sobre'), number: '04', label: 'QUEM SOU EU' },
    { id: 'curriculo', element: document.querySelector('#curriculo'), number: '05', label: 'CURRÍCULO' },
    { id: 'blog', element: document.querySelector('#blog'), number: '06', label: 'BLOG' },
    { id: 'contato', element: document.querySelector('#contato'), number: '07', label: 'CONTATO' }
  ].filter((s) => s.element);

  let currentSection = 'inicio';

  const flyToHeader = (originStop, active) => {
    if (!originStop || !headerTracker) return;
    const originRect = originStop.getBoundingClientRect();
    const destRect = headerTracker.getBoundingClientRect();

    const pill = document.createElement('div');
    pill.className = 'flying-section-pill';
    pill.textContent = `${active.number} // ${active.label}`;
    pill.style.position = 'fixed';
    pill.style.right = '40px';
    pill.style.top = `${originRect.top}px`;
    document.body.appendChild(pill);

    const deltaX = destRect.left + (destRect.width / 2) - (window.innerWidth - 40);
    const deltaY = destRect.top + (destRect.height / 2) - originRect.top;

    const anim = pill.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.3}px) scale(1.1)`, opacity: 0.95, offset: 0.5 },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.95)`, opacity: 0 }
    ], {
      duration: 480,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });

    anim.onfinish = () => {
      pill.remove();
      if (trackerNumber) trackerNumber.textContent = active.number;
      if (trackerTitle) trackerTitle.textContent = active.label;
      headerTracker.classList.remove('pulse-in');
      void headerTracker.offsetWidth;
      headerTracker.classList.add('pulse-in');
    };
  };

  const updateRuler = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;

    rulerIndicator.style.top = `${progress * 100}%`;
    if (rulerPct) rulerPct.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;

    const scrollPos = window.scrollY + window.innerHeight * 0.35;
    let active = sections[0];
    for (const section of sections) {
      const top = section.element.getBoundingClientRect().top + window.scrollY;
      if (scrollPos >= top) {
        active = section;
      }
    }

    if (active && active.id !== currentSection) {
      currentSection = active.id;

      rulerStops.forEach((stop) => {
        stop.classList.toggle('is-active', stop.dataset.section === currentSection);
      });

      const activeStop = document.querySelector(`.ruler-stop[data-section="${currentSection}"]`);
      if (activeStop && headerTracker && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        flyToHeader(activeStop, active);
      } else {
        if (trackerNumber) trackerNumber.textContent = active.number;
        if (trackerTitle) trackerTitle.textContent = active.label;
      }
    }
  };

  window.addEventListener('scroll', updateRuler, { passive: true });
  window.addEventListener('resize', updateRuler, { passive: true });
  updateRuler();
}

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

// ============================================================================
// MODO EDITOR EXCLUSIVO DO PROPRIETÁRIO (TEXTOS & FOTOS)
// ============================================================================
(() => {
  const STORAGE_KEY = 'ib_portfolio_overrides_v1';
  const SESSION_KEY = 'ib_owner_authenticated_v1';
  const TOKEN_KEY = 'ib_owner_gh_token_v1';
  const CUSTOM_HASH_KEY = 'ib_owner_custom_hash_v1';
  // Hash SHA-256 padrão para a chave do proprietário ('icaro2026')
  const DEFAULT_OWNER_HASH = 'd0ff111794fd4aca44dbae817bd2521e15ead6c1ed0483c6b2354465be18e408';
  const GITHUB_REPO = 'icarobragaotaviano/PORTIFOLIO';
  const base = document.body.dataset.base || '/';
  const pageScope = window.location.pathname.replace(new RegExp(`^${base}`), '') || 'home';

  const editableSelector = [
    '#conteudo h1',
    '#conteudo h2',
    '#conteudo h3',
    '#conteudo h4',
    '#conteudo p',
    '#conteudo li',
    '#conteudo .eyebrow',
    '#conteudo .project-category',
    '#conteudo .demo-label',
    '#conteudo .social-handle',
    '#conteudo .social-label',
    '#contato .contact-cta',
    '#contato .contact-channel-card strong'
  ].join(', ');

  const textElements = [...document.querySelectorAll(editableSelector)].filter(
    (el) => !el.closest('#scroll-ruler') && !el.classList.contains('sr-only')
  );
  textElements.forEach((el, index) => {
    if (!el.dataset.editKey) {
      el.dataset.editKey = `${pageScope}:txt:${index}`;
    }
  });

  const imageElements = [...document.querySelectorAll('img[data-edit-img]')];

  let state = { texts: {}, images: {}, updatedAt: null };
  let isEditing = false;

  const loadLocalOverrides = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { texts: {}, images: {} };
    } catch {
      return { texts: {}, images: {} };
    }
  };

  const saveLocalOverrides = () => {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors on private browsing
    }
  };

  const applyOverrides = (data) => {
    if (!data) return;
    if (data.texts) {
      textElements.forEach((el) => {
        const key = el.dataset.editKey;
        if (key && typeof data.texts[key] === 'string') {
          el.innerHTML = data.texts[key];
        }
      });
    }
    if (data.images) {
      imageElements.forEach((img) => {
        const key = img.dataset.editImg;
        if (key && typeof data.images[key] === 'string' && data.images[key]) {
          img.src = data.images[key];
        }
      });
    }
  };

  // Load published overrides from site-overrides.json + merge local owner overrides
  const initOverrides = async () => {
    const local = loadLocalOverrides();
    try {
      const res = await fetch(`${base}site-overrides.json`, { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        state = {
          texts: { ...(remote.texts || {}), ...(local.texts || {}) },
          images: { ...(remote.images || {}), ...(local.images || {}) },
          updatedAt: local.updatedAt || remote.updatedAt || null
        };
      } else {
        state = { texts: { ...(local.texts || {}) }, images: { ...(local.images || {}) }, updatedAt: local.updatedAt };
      }
    } catch {
      state = { texts: { ...(local.texts || {}) }, images: { ...(local.images || {}) }, updatedAt: local.updatedAt };
    }
    applyOverrides(state);
  };

  initOverrides();

  async function sha256(text) {
    const data = new TextEncoder().encode(text.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function compressImageFile(file, maxDim = 1200, quality = 0.84) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl.startsWith('data:image/webp') ? dataUrl : canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Hidden file input for photo uploads
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  let activeTargetImg = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file || !activeTargetImg) return;
    try {
      const dataUrl = await compressImageFile(file);
      const key = activeTargetImg.dataset.editImg;
      activeTargetImg.src = dataUrl;
      state.images[key] = dataUrl;
      saveLocalOverrides();
      showToast('Foto atualizada! Clique em "Publicar na Vercel" para atualizar para todos.');
    } catch {
      showToast('Não foi possível processar a imagem selecionada.', true);
    } finally {
      fileInput.value = '';
    }
  });

  function showToast(message, isError = false) {
    let toast = document.querySelector('#owner-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'owner-toast';
      toast.className = 'owner-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  }

  async function publishToGitHub() {
    let token = localStorage.getItem(TOKEN_KEY) || '';
    if (!token) {
      token = window.prompt(
        'Para publicar na Vercel para todos os visitantes, cole seu Personal Access Token do GitHub (com permissão "repo" / "contents:write" em icarobragaotaviano/PORTIFOLIO):'
      ) || '';
      if (!token.trim()) return;
      localStorage.setItem(TOKEN_KEY, token.trim());
    }

    showToast('Publicando alterações no GitHub / Vercel...');
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/public/site-overrides.json`;
      const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.trim()}`
      };
      const getRes = await fetch(apiUrl, { headers });
      let sha;
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }

      const payload = {
        texts: state.texts,
        images: state.images,
        updatedAt: new Date().toISOString()
      };
      const jsonString = JSON.stringify(payload, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore(cms): atualiza textos e fotos pelo Modo Editor do proprietario',
          content: encoded,
          ...(sha ? { sha } : {}),
          branch: 'main'
        })
      });

      if (!putRes.ok) {
        if (putRes.status === 401 || putRes.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
        }
        throw new Error(`Status ${putRes.status}`);
      }
      saveLocalOverrides();
      showToast('Publicado com sucesso na main! A Vercel atualizará o site em instantes.');
    } catch (err) {
      showToast(`Erro ao publicar no GitHub (${err.message}). Suas edições continuam salvas neste navegador.`, true);
    }
  }

  function enableEditMode() {
    if (isEditing) return;
    isEditing = true;
    sessionStorage.setItem(SESSION_KEY, 'true');
    document.body.classList.add('is-owner-editing');

    textElements.forEach((el) => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'true');
      el.addEventListener('blur', () => {
        const key = el.dataset.editKey;
        if (key) {
          state.texts[key] = el.innerHTML;
          saveLocalOverrides();
        }
      });
    });

    imageElements.forEach((img) => {
      const parent = img.parentElement;
      if (parent && !parent.querySelector('.owner-img-overlay-btn')) {
        parent.classList.add('owner-img-editable-wrap');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'owner-img-overlay-btn';
        btn.innerHTML = '📷 Trocar Foto';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          activeTargetImg = img;
          fileInput.click();
        });
        parent.appendChild(btn);
      }
    });

    renderStudioToolbar();
    showToast('Modo Editor ativado! Clique em qualquer texto para editar ou em "📷 Trocar Foto" nas imagens.');
  }

  function disableEditMode() {
    isEditing = false;
    sessionStorage.removeItem(SESSION_KEY);
    document.body.classList.remove('is-owner-editing');
    textElements.forEach((el) => el.removeAttribute('contenteditable'));
    const bar = document.querySelector('#owner-studio-bar');
    if (bar) bar.remove();
    showToast('Modo Editor encerrado.');
  }

  function renderStudioToolbar() {
    if (document.querySelector('#owner-studio-bar')) return;
    const bar = document.createElement('aside');
    bar.id = 'owner-studio-bar';
    bar.className = 'owner-studio-bar';
    bar.setAttribute('aria-label', 'Painel de edição do proprietário');
    bar.innerHTML = `
      <div class="studio-status">
        <span class="studio-dot"></span>
        <strong>MODO EDITOR // ÍCARO BRAGA</strong>
      </div>
      <div class="studio-actions">
        <button type="button" id="studio-photo-btn" class="studio-btn">📷 Minha Foto ("Quem Sou Eu")</button>
        <button type="button" id="studio-save-btn" class="studio-btn">💾 Salvar no Navegador</button>
        <button type="button" id="studio-publish-btn" class="studio-btn studio-btn-primary">🚀 Publicar na Vercel (GitHub)</button>
        <button type="button" id="studio-reset-btn" class="studio-btn studio-btn-danger">↩ Restaurar</button>
        <button type="button" id="studio-exit-btn" class="studio-btn">✕ Sair</button>
      </div>
    `;
    document.body.appendChild(bar);

    bar.querySelector('#studio-photo-btn').addEventListener('click', () => {
      const profilePhoto = document.querySelector('#owner-profile-photo');
      if (profilePhoto) {
        profilePhoto.scrollIntoView({ behavior: 'smooth', block: 'center' });
        activeTargetImg = profilePhoto;
        fileInput.click();
      }
    });

    bar.querySelector('#studio-save-btn').addEventListener('click', () => {
      textElements.forEach((el) => {
        if (el.dataset.editKey) state.texts[el.dataset.editKey] = el.innerHTML;
      });
      saveLocalOverrides();
      showToast('Todas as alterações foram salvas neste navegador!');
    });

    bar.querySelector('#studio-publish-btn').addEventListener('click', () => {
      publishToGitHub();
    });

    bar.querySelector('#studio-reset-btn').addEventListener('click', () => {
      if (window.confirm('Deseja restaurar as fotos e textos originais neste navegador?')) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }
    });

    bar.querySelector('#studio-exit-btn').addEventListener('click', () => {
      disableEditMode();
    });
  }

  function openAuthModal() {
    if (isEditing) {
      const bar = document.querySelector('#owner-studio-bar');
      if (bar) bar.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    let modal = document.querySelector('#owner-auth-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'owner-auth-modal';
    modal.className = 'owner-modal-backdrop';
    modal.innerHTML = `
      <div class="owner-modal" role="dialog" aria-modal="true" aria-labelledby="owner-modal-title">
        <div class="owner-modal-header">
          <span class="eyebrow">ACESSO RESTRITO // PROPRIETÁRIO</span>
          <button type="button" class="owner-modal-close" aria-label="Fechar">✕</button>
        </div>
        <h3 id="owner-modal-title">Modo Editor do Portfólio</h3>
        <p>Exclusivo para <strong>Ícaro Braga Otaviano</strong>. Desbloqueie para alterar sua foto de perfil, trocar imagens de projetos e editar qualquer texto diretamente na página.</p>
        <form id="owner-auth-form" class="owner-modal-form">
          <label for="owner-pass-input">SENHA DO PROPRIETÁRIO OU TOKEN GITHUB</label>
          <input type="password" id="owner-pass-input" placeholder="Digite sua chave de proprietário..." autocomplete="current-password" required>
          <p class="owner-modal-error" id="owner-modal-error" hidden>Chave incorreta. Acesso permitido apenas ao proprietário.</p>
          <div class="owner-modal-buttons">
            <button type="submit" class="studio-btn studio-btn-primary">Desbloquear Modo Editor ↗</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#owner-pass-input');
    const errorEl = modal.querySelector('#owner-modal-error');
    input.focus();

    modal.querySelector('.owner-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#owner-auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;

      // Verifica se é um Personal Access Token do GitHub com permissão no repositório
      if (val.startsWith('ghp_') || val.startsWith('github_pat_')) {
        try {
          const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
            headers: { Authorization: `Bearer ${val}` }
          });
          if (res.ok) {
            const repo = await res.json();
            if (repo.permissions && repo.permissions.push) {
              localStorage.setItem(TOKEN_KEY, val);
              modal.remove();
              enableEditMode();
              return;
            }
          }
        } catch {
          // Fallthrough to hash check
        }
      }

      const hashed = await sha256(val);
      const expectedHash = localStorage.getItem(CUSTOM_HASH_KEY) || DEFAULT_OWNER_HASH;
      if (hashed === expectedHash) {
        modal.remove();
        enableEditMode();
      } else {
        errorEl.hidden = false;
      }
    });
  }

  const accessBtn = document.querySelector('#owner-access-btn');
  if (accessBtn) {
    accessBtn.addEventListener('click', openAuthModal);
  }

  // Atalho de teclado Ctrl+Shift+E (ou Cmd+Shift+E no Mac)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      openAuthModal();
    }
  });

  // Se já autenticado nesta sessão ou se abrir com ?admin
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    enableEditMode();
  } else if (window.location.search.includes('admin') || window.location.hash === '#admin') {
    openAuthModal();
  }
})();

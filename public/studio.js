import { renderPortfolioProject } from './portfolio.js';

const base = document.body.dataset.base || '/';
const root = document.querySelector('#studio-root');
const dialog = document.querySelector('#studio-dialog');
const filesInput = document.querySelector('#studio-files');
const e = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-6-6L3 21"/>', text:'<path d="M5 5h14M12 5v14M8 19h8"/>', video:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>', embed:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', arrow:'<path d="M7 17 17 7M7 7h10v10"/>', settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', back:'<path d="m12 5-7 7 7 7M5 12h14"/>', more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', grip:'<path d="M9 4h.01M15 4h.01M9 9h.01M15 9h.01M9 15h.01M15 15h.01M9 20h.01M15 20h.01"/>', trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>', up:'<path d="m6 15 6-6 6 6"/>', down:'<path d="m6 9 6 6 6-6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', check:'<path d="m5 12 4 4L19 6"/>', copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>', divider:'<path d="M3 12h18M12 4v2M12 18v2"/>', lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>', logout:'<path d="M9 4H4v16h5m6-13 5 5-5 5m-7-5h12"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.plus}</svg>`;
let projects = [], current = null, dirty = false, busy = false, uploading = false, tab = 'all', query = '', category = '', view = 'grid', reorder = false, dragging = null, fileAction = null, localMode = false;
const AUTH_KEY = 'ib_studio_auth_v1', SESSION_KEY = 'ib_studio_session_v1', PROJECTS_KEY = 'ib_studio_projects_v1';

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function localSeed() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECTS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  try {
    const url = new URL(`${base}api/portfolio`, location.origin); url.searchParams.set('action', 'public');
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    const data = await res.json();
    if (Array.isArray(data?.projects)) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(data.projects));
      return data.projects;
    }
  } catch {}
  return [];
}

async function localApi(action, { method = 'GET', body, id } = {}) {
  let auth = null;
  try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch {}
  const authenticated = Boolean(auth && sessionStorage.getItem(SESSION_KEY) === '1');
  if (action === 'session') return { authenticated, setupRequired: !auth, configured: Boolean(auth), storageConfigured: true };
  if (action === 'setup' && method === 'POST') {
    const password = String(body?.password || '');
    if (password.length < 12) throw new Error('Escolha uma senha com pelo menos 12 caracteres.');
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await hashPassword(password, salt);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ salt, hash }));
    return { configured: true, authenticated: false, setupRequired: false };
  }
  if (action === 'login' && method === 'POST') {
    if (!auth) throw new Error('Crie sua senha primeiro.');
    const hash = await hashPassword(String(body?.password || ''), auth.salt);
    if (hash !== auth.hash) throw new Error('Senha incorreta.');
    sessionStorage.setItem(SESSION_KEY, '1');
    return { authenticated: true };
  }
  if (action === 'logout' && method === 'POST') {
    sessionStorage.removeItem(SESSION_KEY);
    return { authenticated: false };
  }
  if (!authenticated) { current = null; dirty = false; await boot(); throw new Error('Sessão expirada. Entre novamente.'); }
  const list = await localSeed();
  const persist = (next) => { localStorage.setItem(PROJECTS_KEY, JSON.stringify(next)); return next; };
  if (action === 'projects') return { projects: list };
  if (action === 'upload' && method === 'POST') return { url: body.dataUrl };
  if (action === 'project' && method === 'PUT') {
    const item = { ...body, id: body.id || uid(), updatedAt: new Date().toISOString() };
    const idx = list.findIndex(p => p.id === item.id);
    if (idx < 0) list.unshift(item); else list[idx] = item;
    persist(list);
    return { project: item };
  }
  if (action === 'project' && method === 'DELETE') {
    persist(list.filter(p => p.id !== id));
    return { ok: true };
  }
  if (action === 'duplicate' && method === 'POST') {
    const orig = list.find(p => p.id === id);
    if (!orig) throw new Error('Projeto não encontrado.');
    const copy = { ...structuredClone(orig), id: uid(), slug: `${orig.slug}-copia-${Date.now().toString(36).slice(-4)}`, title: `${orig.title} (Cópia)`, publication: 'draft', updatedAt: new Date().toISOString() };
    list.splice(list.indexOf(orig) + 1, 0, copy);
    persist(list);
    return { project: copy };
  }
  if (action === 'order' && method === 'PUT') {
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const map = new Map(list.map(p => [p.id, p]));
    const next = [...ids.map(k => map.get(k)).filter(Boolean), ...list.filter(p => !ids.includes(p.id))];
    return { projects: persist(next) };
  }
  throw new Error('Ação indisponível.');
}

function toast(message, error = false) {
  const el = document.querySelector('#studio-toast');
  el.textContent = message; el.className = `show${error ? ' error' : ''}`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.className = '', 5000);
}
async function api(action, { method = 'GET', body, id } = {}) {
  if (localMode && action !== 'session') return localApi(action, { method, body, id });
  const url = new URL(`${base}api/portfolio`, location.origin); url.searchParams.set('action', action); if (id) url.searchParams.set('id', id);
  let response, data;
  try {
    response = await fetch(url, { method, credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : {headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}) });
    data = await response.json().catch(() => ({ error:'Não foi possível ler a resposta do servidor.' }));
  } catch {
    localMode = true;
    return localApi(action, { method, body, id });
  }
  if (action === 'session' && (!response.ok || (!data.configured && !data.setupRequired) || data.storageConfigured === false)) {
    localMode = true;
    return localApi('session');
  }
  if (!response.ok) { if (response.status === 401 && action !== 'login') { current = null; dirty = false; await boot(); } throw new Error(data.error || `Não foi possível concluir (${response.status}).`); }
  localMode = false;
  return data;
}
const brand = `<a class="studio-brand" href="${base}" aria-label="Ícaro Braga — portfólio"><span class="brand-mark">ib<span>.</span></span><span>ÍCARO BRAGA<small>ESTÚDIO CRIATIVO</small></span></a>`;
function header(editor = false) {
  return `<header class="studio-header">${editor ? `<button class="icon-btn" data-action="back" aria-label="Voltar aos projetos">${icon('back')}</button><div class="editor-name"><strong id="editor-title">${e(current.title)}</strong><span id="save-status">${current.publication === 'published' ? 'Publicado' : 'Rascunho'} · ${current.updatedAt ? 'Salvo' : 'Novo projeto'}</span></div>` : brand}
  ${editor ? `<div class="editor-actions"><button class="btn btn-quiet" data-action="preview" aria-label="Visualizar projeto">${icon('eye')}<span>Visualizar</span></button><button class="btn btn-outline" data-action="save">Salvar${current.publication === 'published' ? ' alterações' : ' rascunho'}</button><button class="btn btn-primary" data-action="publish-settings">${current.publication === 'published' ? 'Atualizar projeto' : 'Continuar'} ${icon('arrow')}</button></div>` : `<nav class="studio-top-nav" aria-label="Estúdio"><span class="active">Meus projetos</span><a href="${base}#projetos" target="_blank" rel="noopener">Ver portfólio ${icon('arrow')}</a></nav><div class="studio-account"><span class="private-badge">${icon('lock')} Área privada</span><button class="avatar" data-action="account" aria-label="Opções da conta">IB</button></div>`}</header>`;
}
async function boot() {
  try {
    const session = await api('session');
    if (!session.authenticated) { renderLogin(session); return; }
    projects = (await api('projects')).projects; renderDashboard();
  } catch (error) { renderLogin({configured:false,error:error.message}); }
}
function renderLogin(session) {
  root.innerHTML = `<div class="login-layout"><div class="login-story">${brand}<div><span class="overline">SEU TRABALHO MERECE SER VISTO.</span><h1>Grandes ideias.<br>Um lugar<br><em>para elas.</em></h1><p>Organize seus projetos, construa suas histórias<br>e dê ao seu portfólio a sua melhor versão.</p></div><span class="login-foot">DIREÇÃO DE ARTE / DESIGN / MOTION / IA</span></div><main id="studio-main" class="login-main"><div class="login-box"><span class="login-icon">${icon('lock')}</span><p class="overline">ESTÚDIO ÍCARO BRAGA</p><h2>${session.setupRequired ? 'Seu estúdio começa aqui.' : 'Bom ter você de volta.'}</h2><p>${session.setupRequired ? 'Crie sua senha de proprietário para acessar e organizar seus projetos neste computador.' : 'Entre para criar, editar e organizar seus projetos.'}</p>${session.configured === false && !session.setupRequired ? `<div class="notice error">${e(session.error || 'O acesso do proprietário ainda precisa ser configurado no servidor. Consulte a configuração do Estúdio no projeto.')}</div><a class="btn btn-outline" href="${base}">Voltar ao portfólio</a>` : `<form id="login-form"><label for="password">${session.setupRequired ? 'Crie uma senha' : 'Sua senha'}</label><div class="password-field"><input type="password" id="password" name="password" autocomplete="${session.setupRequired ? 'new-password' : 'current-password'}" ${session.setupRequired ? 'minlength="12"' : ''} placeholder="${session.setupRequired ? 'Pelo menos 12 caracteres' : 'Digite sua senha'}" required><button type="button" class="icon-btn" data-action="show-password" aria-label="Mostrar senha">${icon('eye')}</button></div>${session.setupRequired ? '<label for="confirm-password">Repita a senha</label><input type="password" id="confirm-password" autocomplete="new-password" minlength="12" required>' : ''}<p id="login-error" role="alert" class="form-error"></p><button type="submit" class="btn btn-primary btn-full">${session.setupRequired ? 'Criar meu acesso' : 'Entrar no estúdio'} ${icon('arrow')}</button></form><p class="login-private">${icon('lock')} Acesso exclusivo do proprietário</p>`}</div><a class="login-back" href="${base}">← Voltar ao portfólio</a></main></div>`;
  document.querySelector('#login-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const password = document.querySelector('#password').value; const errorEl = document.querySelector('#login-error');
    if (session.setupRequired && password !== document.querySelector('#confirm-password').value) { errorEl.textContent = 'As senhas precisam ser iguais.'; return; }
    const button = event.target.querySelector('[type=submit]'); button.disabled = true; errorEl.textContent = '';
    try { if (session.setupRequired) await api('setup', {method:'POST',body:{password}}); await api('login', {method:'POST',body:{password}}); await boot(); }
    catch (error) { errorEl.textContent = error.message; button.disabled = false; }
  });
}
function renderDashboard() {
  current = null; dirty = false;
  root.innerHTML = `${header()}<div class="studio-workspace"><aside class="profile-sidebar"><div class="profile-orbit"><span>IB</span><span class="profile-dot"></span></div><h1>Ícaro Braga<span>Otaviano</span></h1><p class="profile-role">Direção de arte, design<br>& produção audiovisual</p><span class="profile-location">Fortaleza, Ceará, BR</span><a class="btn btn-outline btn-full" href="${base}#sobre" target="_blank" rel="noopener">Ver perfil público ${icon('arrow')}</a><div class="sidebar-rule"></div><p class="overline">MEU ESPAÇO CRIATIVO</p><button class="sidebar-nav active" data-action="all-projects">${icon('grid')} Projetos <span>${projects.length}</span></button><button class="sidebar-nav" data-action="draft-projects">${icon('image')} Rascunhos <span>${projects.filter(p => p.publication === 'draft').length}</span></button><div class="sidebar-tip"><span>Seu próximo grande<br>projeto começa aqui.</span><p>Adicione imagens, conte a história e escolha como apresentar cada detalhe.</p>${icon('arrow')}</div><button class="sidebar-nav logout" data-action="logout">${icon('logout')} Sair do estúdio</button></aside><main id="studio-main" class="projects-main"><div class="dashboard-heading"><div><p class="overline">SEU PORTFÓLIO, DO SEU JEITO</p><h2>Meus projetos<span>.</span></h2><p>Um espaço para suas ideias ganharem forma.</p></div><button class="btn btn-primary" data-action="new">${icon('plus')} Criar projeto</button></div><div class="project-tabs" role="tablist" aria-label="Status dos projetos">${[['all','Todos os projetos',projects.length],['published','Publicados',projects.filter(p=>p.publication==='published').length],['draft','Rascunhos',projects.filter(p=>p.publication==='draft').length]].map(([id,label,count])=>`<button role="tab" data-tab="${id}" aria-selected="${tab===id}">${label}<span>${count}</span></button>`).join('')}</div><div class="projects-toolbar"><label class="search-input">${icon('search')}<input id="project-search" type="search" placeholder="Buscar um projeto…" value="${e(query)}" aria-label="Buscar projeto"></label><select id="project-category" aria-label="Filtrar por área"><option value="">Todas as áreas</option>${[...new Set(projects.map(p=>p.category).filter(Boolean))].map(c=>`<option ${category===c?'selected':''}>${e(c)}</option>`).join('')}</select><button class="btn btn-quiet reorder-toggle ${reorder?'selected':''}" data-action="reorder" aria-pressed="${reorder}">${icon('grip')}<span>Organizar</span></button><div class="view-switch" aria-label="Exibição"><button class="icon-btn ${view==='grid'?'selected':''}" data-view="grid" aria-label="Exibir em grade" aria-pressed="${view==='grid'}">${icon('grid')}</button><button class="icon-btn ${view==='list'?'selected':''}" data-view="list" aria-label="Exibir em lista" aria-pressed="${view==='list'}">${icon('list')}</button></div></div><p id="organize-hint" class="organize-hint" ${reorder?'':'hidden'}>Arraste as capas para ordenar o portfólio. Use também as setas de cada projeto. A ordem é salva para os visitantes.</p><div id="projects-results"></div><footer class="projects-footer"><span id="project-count"></span><span>${icon('lock')} Só você vê os rascunhos.</span></footer></main></div>`;
  renderCards();
  document.querySelector('#project-search').addEventListener('input', event=>{query=event.target.value;renderCards();});
  document.querySelector('#project-category').addEventListener('change', event=>{category=event.target.value;renderCards();});
}
function renderCards() {
  const list = projects.filter(p=>(tab==='all'||p.publication===tab)&&(!category||p.category===category)&&`${p.title} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const results = document.querySelector('#projects-results'); if (!results) return;
  results.className = `studio-project-grid ${view==='list'?'list-view':''} ${reorder?'is-organizing':''}`;
  results.innerHTML = list.map(p=>`<article class="studio-project-card" data-id="${e(p.id)}" draggable="${reorder}" tabindex="${reorder?'0':'-1'}"><div class="studio-cover"><button class="cover-open" data-action="edit" data-id="${e(p.id)}" aria-label="Editar ${e(p.title)}">${p.cover?`<img src="${e(p.cover)}" alt="${e(p.coverAlt||p.title)}" loading="lazy">`:`<span class="empty-cover">${icon('image')}<span>${e(p.title)}</span></span>`}<span class="cover-edit">Abrir projeto ${icon('arrow')}</span></button><span class="publication-badge ${p.publication==='draft'?'draft':''}"><i></i>${p.publication==='published'?'Publicado':'Rascunho'}</span><details class="card-menu"><summary aria-label="Opções de ${e(p.title)}">${icon('more')}</summary><div><button data-action="edit" data-id="${e(p.id)}">Editar projeto</button><button data-action="duplicate" data-id="${e(p.id)}">Duplicar</button>${p.publication==='published'?`<button data-action="unpublish" data-id="${e(p.id)}">Mover para rascunhos</button><a href="${base}projetos/${e(p.slug)}/" target="_blank" rel="noopener">Ver no portfólio ↗</a>`:''}<button class="danger-text" data-action="delete" data-id="${e(p.id)}">Excluir projeto</button></div></details></div><div class="studio-card-info"><div><button class="project-title-button" data-action="edit" data-id="${e(p.id)}">${e(p.title)}</button><p>${e(p.category||'Área criativa a definir')}</p></div><span class="card-updated">${p.updatedAt?new Date(p.updatedAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'Novo'}</span></div>${reorder?`<div class="card-order"><span>${icon('grip')} Arraste para mover</span><button class="icon-btn" data-action="project-up" data-id="${e(p.id)}" aria-label="Mover ${e(p.title)} para antes">${icon('up')}</button><button class="icon-btn" data-action="project-down" data-id="${e(p.id)}" aria-label="Mover ${e(p.title)} para depois">${icon('down')}</button></div>`:''}</article>`).join('') + (!query && !category && tab!=='published'?`<button class="new-project-card" data-action="new"><span>${icon('plus')}</span><strong>Uma nova ideia?</strong><small>Crie seu próximo projeto</small></button>`:'');
  if (!list.length && (query||category||tab==='published')) results.innerHTML = `<div class="empty-results">${icon('search')}<h3>Nenhum projeto por aqui.</h3><p>${query||category?'Experimente outra busca ou área criativa.':'Publique um projeto para começar a contar sua história.'}</p></div>`;
  document.querySelector('#project-count').textContent = `${list.length} ${list.length===1?'projeto':'projetos'}`;
}
function newProject() {
  current = {id:uid(),slug:`projeto-${Date.now().toString(36)}`,title:'Projeto sem título',category:'',description:'',cover:'',coverAlt:'',tags:[],tools:[],credits:'',client:'',year:'',publication:'draft',status:'real',note:'',blocks:[],styles:{background:'#171715',spacing:0,width:1400}};
  dirty=true; renderEditor();
}
function renderEditor() {
  root.innerHTML = `${header(true)}<main id="studio-main" class="editor-layout"><section class="editor-stage"><div class="canvas-intro"><span class="overline">CONTEÚDO DO PROJETO</span><span>Construa uma história, bloco por bloco.</span></div><div class="project-canvas" id="project-canvas"></div><div class="canvas-bottom"><button class="btn btn-outline" data-action="add-image">${icon('plus')} Adicionar conteúdo</button></div></section><aside class="editor-sidebar"><div class="sidebar-section"><h2>Adicionar conteúdo</h2><div class="content-tools">${[['image','Imagem'],['text','Texto'],['grid','Grade de fotos'],['video','Vídeo'],['embed','Incorporar'],['divider','Divisor']].map(([type,label])=>`<button data-action="add-${type}">${icon(type)}<span>${label}</span></button>`).join('')}</div></div><div class="sidebar-section"><h2>Editar projeto</h2><button class="editor-option" data-action="settings">${icon('settings')} Informações do projeto ${icon('arrow')}</button><button class="editor-option" data-action="styles">${icon('grid')} Estilos e espaçamento ${icon('arrow')}</button></div><div class="sidebar-section project-progress"><span class="overline">SUA HISTÓRIA</span><h3 id="block-count">${current.blocks.length} blocos de conteúdo</h3><p>Imagens em alta, textos com respiro e uma boa sequência fazem toda a diferença.</p><div class="editor-help"><span>01</span> Adicione seu conteúdo<br><span>02</span> Organize a narrativa<br><span>03</span> Escolha a capa e publique</div></div><div class="sidebar-bottom">${icon('lock')} ${current.publication==='draft'?'Seu rascunho é privado.':'Este projeto está no seu portfólio.'}</div></aside></main>`;
  renderCanvas(); markDirty(dirty);
}
function renderCanvas() {
  const canvas=document.querySelector('#project-canvas'); if(!canvas)return;
  canvas.style.background=current.styles.background; const rgb=current.styles.background.slice(1);canvas.classList.toggle('is-dark',parseInt(rgb.slice(0,2),16)*.299+parseInt(rgb.slice(2,4),16)*.587+parseInt(rgb.slice(4,6),16)*.114<140); canvas.style.gap=`${current.styles.spacing}px`;
  canvas.innerHTML = current.blocks.length ? current.blocks.map((block,index)=>`<article class="canvas-block block-${e(block.type)} size-${e(block.size||'full')}" data-block="${e(block.id)}"><div class="block-controls"><button class="icon-btn block-drag" draggable="true" data-drag-block="${e(block.id)}" aria-label="Arrastar bloco ${index+1}">${icon('grip')}</button><span>${index+1} / ${e({image:'Imagem',text:'Texto',grid:'Grade de fotos',video:'Vídeo',embed:'Incorporado',divider:'Divisor'}[block.type])}</span><button class="icon-btn" data-action="block-up" data-block-id="${e(block.id)}" aria-label="Mover bloco para cima" ${index===0?'disabled':''}>${icon('up')}</button><button class="icon-btn" data-action="block-down" data-block-id="${e(block.id)}" aria-label="Mover bloco para baixo" ${index===current.blocks.length-1?'disabled':''}>${icon('down')}</button><button class="icon-btn" data-action="block-settings" data-block-id="${e(block.id)}" aria-label="Editar opções do bloco">${icon('settings')}</button><button class="icon-btn" data-action="block-duplicate" data-block-id="${e(block.id)}" aria-label="Duplicar bloco">${icon('copy')}</button><button class="icon-btn danger-text" data-action="block-delete" data-block-id="${e(block.id)}" aria-label="Remover bloco">${icon('trash')}</button></div><div class="block-content" style="text-align:${e(block.align||'left')}">${blockMarkup(block)}</div>${block.caption?`<p class="block-caption">${e(block.caption)}</p>`:''}</article>`).join('') : `<div class="empty-canvas"><div class="empty-canvas-icon">${icon('image')}</div><h1>Mostre o que você cria.</h1><p>Comece com uma imagem, uma ideia ou uma história.<br>Seu próximo projeto ganha vida aqui.</p><button class="btn btn-primary" data-action="add-image">${icon('plus')} Adicionar imagens</button><div class="empty-canvas-alternatives"><button data-action="add-text">${icon('text')} Texto</button><button data-action="add-grid">${icon('grid')} Grade de fotos</button><button data-action="add-video">${icon('video')} Vídeo</button></div><small>PNG, JPG, GIF e WebP · até 3 MB por imagem</small></div>`;
  canvas.querySelectorAll('[data-text-block]').forEach(el=>{el.style.height='auto';el.style.height=`${Math.max(el.scrollHeight,100)}px`;});
  const count=document.querySelector('#block-count'); if(count)count.textContent=`${current.blocks.length} blocos de conteúdo`;
}
function blockMarkup(b) {
  if(b.type==='image')return `<img src="${e(b.src)}" alt="${e(b.alt)}"><button class="replace-image" data-action="replace-image" data-block-id="${e(b.id)}">Trocar imagem</button>`;
  if(b.type==='text')return `<textarea class="block-text format-${e(b.format||'paragraph')}" data-text-block="${e(b.id)}" aria-label="Texto do bloco" placeholder="Conte a história do seu projeto…" style="text-align:${e(b.align||'left')}">${e(b.text)}</textarea>`;
  if(b.type==='grid')return `<div class="editor-photo-grid">${b.images.map((img,i)=>`<figure><img src="${e(img.src)}" alt="${e(img.alt)}"><button class="icon-btn" data-action="grid-remove" data-block-id="${e(b.id)}" data-index="${i}" aria-label="Remover foto ${i+1}">${icon('close')}</button></figure>`).join('')}<button class="grid-add" data-action="grid-add" data-block-id="${e(b.id)}">${icon('plus')}<span>Adicionar fotos</span></button></div>`;
  if(b.type==='divider')return '<hr>';
  if(b.type==='video'&&/\.(mp4|webm|ogg)(?:\?|$)/i.test(b.src))return `<video src="${e(b.src)}" controls preload="metadata"></video>`;
  return `<div class="embed-placeholder">${icon('video')}<strong>${b.type==='video'?'Vídeo':'Conteúdo incorporado'}</strong><span>${e(b.src)}</span><button class="btn btn-outline" data-action="edit-media" data-block-id="${e(b.id)}">Editar endereço</button></div>`;
}
function markDirty(value=true) {
  dirty=value;const status=document.querySelector('#save-status');if(status)status.textContent=dirty?'Alterações não salvas':`Salvo${current?.updatedAt?' às '+new Date(current.updatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''} · ${current?.publication==='published'?'Publicado':'Rascunho'}`;
}
async function save(publication=current.publication) {
  if(busy||uploading)return false;busy=true;root.inert=true;dialog.inert=true;root.setAttribute('aria-busy','true');document.querySelectorAll('[data-action="save"],[data-action="confirm-publish"]').forEach(b=>b.disabled=true);
  try {
    const result=await api('project',{method:'PUT',body:{...current,publication}});current=result.project;
    const index=projects.findIndex(p=>p.id===current.id);if(index<0)projects.unshift(current);else projects[index]=current;
    markDirty(false);toast(publication==='published'?'Projeto atualizado no portfólio.':'Rascunho salvo. Só você pode vê-lo.');return true;
  }catch(error){toast(error.message,true);return false;}
  finally{busy=false;root.inert=false;dialog.inert=false;root.removeAttribute('aria-busy');document.querySelectorAll('[data-action="save"],[data-action="confirm-publish"]').forEach(b=>b.disabled=false);}
}
function showDialog(content, className='') {
  if(dialog.open)dialog.close();dialog.className=className;dialog.innerHTML=`<button class="dialog-close icon-btn" data-action="close-dialog" aria-label="Fechar">${icon('close')}</button>${content}`;dialog.showModal();
}
async function confirmAction(title,text,label='Confirmar',danger=false) {
  showDialog(`<div class="dialog-body"><p class="overline">MEUS PROJETOS</p><h2>${e(title)}</h2><p>${e(text)}</p><div class="dialog-buttons"><button class="btn btn-outline" data-confirm="false">Cancelar</button><button class="btn ${danger?'btn-danger':'btn-primary'}" data-confirm="true">${e(label)}</button></div></div>`,'small-dialog');
  return new Promise(resolve=>{
    const abort=()=>resolve(false);dialog.addEventListener('close',abort,{once:true});
    dialog.querySelectorAll('[data-confirm]').forEach(b=>b.onclick=()=>{dialog.removeEventListener('close',abort);const yes=b.dataset.confirm==='true';dialog.close();resolve(yes);});
  });
}
function settings(publish=false) {
  const availableCovers=current.blocks.flatMap(block=>block.type==='image'?[{src:block.src,alt:block.alt}]:block.type==='grid'?block.images:[]).filter((image,index,all)=>all.findIndex(item=>item.src===image.src)===index);
  showDialog(`<div class="settings-dialog"><div class="settings-heading"><p class="overline">${publish?'ÚLTIMOS DETALHES':'CONFIGURAÇÕES DO PROJETO'}</p><h2>${publish?'Pronto para ganhar o mundo?':'Dê contexto à sua criação.'}</h2><p>A capa é o primeiro encontro com o seu trabalho.</p></div><form id="project-settings"><div class="settings-columns"><div class="cover-settings"><label>Capa do projeto <span class="required">*</span></label><button type="button" class="cover-picker" data-action="choose-cover">${current.cover?`<img id="settings-cover" src="${e(current.cover)}" alt="Capa do projeto">`:`<span>${icon('image')}<strong>Escolher imagem</strong><small>Uma boa capa faz a diferença.</small></span>`}<span class="cover-picker-overlay">${icon('image')} Trocar capa</span></button><p class="field-hint">Proporção 4:3 · PNG, JPG, GIF ou WebP</p><label for="cover-alt">Descrição da capa</label><input id="cover-alt" name="coverAlt" value="${e(current.coverAlt)}" placeholder="Descreva a imagem para acessibilidade"></div><div class="settings-fields"><label for="project-title">Título do projeto <span class="required">*</span></label><input id="project-title" name="title" value="${e(current.title)}" maxlength="120" required><div class="field-pair"><div><label for="project-area">Área criativa <span class="required">*</span></label><input id="project-area" name="category" list="creative-areas" value="${e(current.category)}" placeholder="Ex.: Identidade visual" ${publish?'required':''}><datalist id="creative-areas">${['Branding','Direção de arte','Design gráfico','Editorial','Fotografia','Motion Design','Audiovisual','Campanha','Ilustração','Criações com IA','UI/UX'].map(v=>`<option value="${v}">`).join('')}</datalist></div><div><label for="project-year">Ano</label><input id="project-year" name="year" value="${e(current.year)}" placeholder="Ex.: 2026"></div></div><label for="project-description">Sobre o projeto</label><textarea id="project-description" name="description" rows="3" placeholder="A ideia, o desafio e o que você criou…">${e(current.description)}</textarea><label for="project-tags">Tags</label><input id="project-tags" name="tags" value="${e(current.tags.join(', '))}" placeholder="branding, identidade, design"><p class="field-hint">Separe as tags por vírgulas.</p><label for="project-tools">Ferramentas utilizadas</label><input id="project-tools" name="tools" value="${e(current.tools.join(', '))}" placeholder="Photoshop, Illustrator, After Effects"><div class="field-pair"><div><label for="project-client">Cliente</label><input id="project-client" name="client" value="${e(current.client)}" placeholder="Opcional"></div><div><label for="project-nature">Natureza</label><select id="project-nature" name="status">${[['real','Trabalho / projeto autoral'],['demo','Estudo demonstrativo'],['placeholder','Espaço reservado']].map(([v,t])=>`<option value="${v}" ${current.status===v?'selected':''}>${t}</option>`).join('')}</select></div></div><label for="project-credits">Créditos</label><textarea id="project-credits" name="credits" rows="2" placeholder="Quem fez parte deste projeto?">${e(current.credits)}</textarea><label for="project-note">Nota de contexto</label><textarea id="project-note" name="note" rows="2" placeholder="Informações sobre o estudo, direitos ou apresentação.">${e(current.note)}</textarea><label for="project-slug">Endereço do projeto</label><div class="slug-field"><span>/projetos/</span><input id="project-slug" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${e(current.slug)}" required></div></div></div><p id="settings-error" class="form-error" role="alert"></p><div class="settings-footer"><span>${icon('lock')} ${publish?'O projeto ficará visível no seu portfólio.':'As informações serão aplicadas ao editor.'}</span><button type="submit" class="btn btn-primary" data-action="confirm-publish">${publish?(current.publication==='published'?'Atualizar projeto':'Publicar projeto'):'Aplicar informações'} ${icon('arrow')}</button></div></form></div>`,'wide-dialog');
  if(availableCovers.length){
    const coverList=document.createElement('div');coverList.className='available-covers';coverList.innerHTML=`<p class="field-hint">Ou use uma imagem do projeto:</p><div>${availableCovers.map((image,index)=>`<button type="button" data-existing-cover="${index}" aria-label="Usar imagem ${index+1} como capa"><img src="${e(image.src)}" alt="${e(image.alt)}"></button>`).join('')}</div>`;
    dialog.querySelector('.cover-picker').after(coverList);
    coverList.addEventListener('click',event=>{const button=event.target.closest('[data-existing-cover]');if(!button)return;const image=availableCovers[Number(button.dataset.existingCover)];current.cover=image.src;current.coverAlt=image.alt||current.title;dialog.querySelector('#cover-alt').value=current.coverAlt;dialog.querySelector('.cover-picker').innerHTML=`<img src="${e(image.src)}" alt="Capa do projeto"><span class="cover-picker-overlay">${icon('image')} Trocar capa</span>`;markDirty();});
  }
  document.querySelector('#project-settings').addEventListener('submit',async event=>{
    event.preventDefault(); const data=new FormData(event.target); const updated={...current};
    for(const key of ['title','category','description','year','client','credits','status','slug','note','coverAlt'])updated[key]=String(data.get(key)||'').trim();
    for(const key of ['tags','tools'])updated[key]=String(data.get(key)||'').split(',').map(v=>v.trim()).filter(Boolean);
    const errorEl=document.querySelector('#settings-error');
    if(publish&&updated.status!=='placeholder'&&(!updated.cover||!updated.category||!updated.blocks.length)){errorEl.textContent='Adicione uma capa, uma área criativa e ao menos um bloco de conteúdo antes de publicar.';return;}
    if((updated.status==='demo'||updated.status==='placeholder')&&!updated.note){errorEl.textContent='Mantenha uma nota de contexto para identificar estudos demonstrativos e espaços reservados.';return;}
    updated.coverAlt ||= updated.title;current=updated;markDirty();
    if(publish){if(await save('published')){dialog.close();renderEditor();}}else{dialog.close();renderEditor();markDirty();}
  });
}
function stylesDialog() {
  showDialog(`<div class="dialog-body"><p class="overline">ESTILOS DO PROJETO</p><h2>Espaço para sua ideia respirar.</h2><form id="project-styles"><label for="style-bg">Cor de fundo</label><div class="color-field"><input type="color" id="style-bg" name="background" value="${e(current.styles.background)}"><span>${e(current.styles.background)}</span></div><label for="style-spacing">Espaço entre blocos <output id="spacing-value">${current.styles.spacing}px</output></label><input type="range" id="style-spacing" name="spacing" min="0" max="160" step="4" value="${current.styles.spacing}"><label for="style-width">Largura do projeto</label><select id="style-width" name="width">${[800,1000,1200,1400,1600,1800].map(v=>`<option value="${v}" ${current.styles.width===v?'selected':''}>${v} px</option>`).join('')}</select><div class="dialog-buttons"><button class="btn btn-primary" type="submit">Aplicar estilos</button></div></form></div>`,'small-dialog');
  document.querySelector('#style-spacing').oninput=event=>document.querySelector('#spacing-value').textContent=`${event.target.value}px`;
  document.querySelector('#style-bg').oninput=event=>event.target.nextElementSibling.textContent=event.target.value;
  document.querySelector('#project-styles').onsubmit=event=>{event.preventDefault();const f=new FormData(event.target);current.styles={background:f.get('background'),spacing:Number(f.get('spacing')),width:Number(f.get('width'))};markDirty();dialog.close();renderCanvas();};
}
function blockSettings(id) {
  const block=current.blocks.find(b=>b.id===id);if(!block)return;
  showDialog(`<div class="dialog-body"><p class="overline">OPÇÕES DO BLOCO</p><h2>Cada detalhe conta.</h2><form id="block-form">${block.type==='text'?`<label for="text-format">Estilo do texto</label><select id="text-format" name="format">${[['paragraph','Parágrafo'],['heading','Título'],['subheading','Subtítulo']].map(([v,t])=>`<option value="${v}" ${block.format===v?'selected':''}>${t}</option>`).join('')}</select>`:''}<label for="block-align">Alinhamento</label><select id="block-align" name="align">${[['left','À esquerda'],['center','Centralizado'],['right','À direita']].map(([v,t])=>`<option value="${v}" ${block.align===v?'selected':''}>${t}</option>`).join('')}</select><label for="block-size">Largura</label><select id="block-size" name="size">${[['full','Largura total'],['wide','Ampla'],['normal','Com margens']].map(([v,t])=>`<option value="${v}" ${(block.size||'full')===v?'selected':''}>${t}</option>`).join('')}</select>${block.type==='image'?`<label for="block-alt">Descrição da imagem</label><input id="block-alt" name="alt" value="${e(block.alt)}">`:''}<label for="block-caption">Legenda</label><input id="block-caption" name="caption" value="${e(block.caption)}">${block.type==='grid'?'<p class="field-hint">Para alterar a sequência das fotos, use os controles abaixo.</p><div class="grid-order-list">'+block.images.map((img,i)=>`<div><img src="${e(img.src)}" alt="Foto ${i+1}"><span>Foto ${i+1}</span><button type="button" class="icon-btn" data-action="grid-up" data-block-id="${e(id)}" data-index="${i}" aria-label="Mover foto ${i+1} para antes" ${i===0?'disabled':''}>${icon('up')}</button><button type="button" class="icon-btn" data-action="grid-down" data-block-id="${e(id)}" data-index="${i}" aria-label="Mover foto ${i+1} para depois" ${i===block.images.length-1?'disabled':''}>${icon('down')}</button></div>`).join('')+'</div>':''}<div class="dialog-buttons"><button type="submit" class="btn btn-primary">Aplicar ao bloco</button></div></form></div>`,'small-dialog');
  document.querySelector('#block-form').onsubmit=event=>{event.preventDefault();const f=new FormData(event.target);for(const key of ['align','size','caption','alt','format'])if(f.has(key))block[key]=f.get(key);markDirty();dialog.close();renderCanvas();};
}
function mediaDialog(type,id) {
  const block=id?current.blocks.find(b=>b.id===id):null;
  showDialog(`<div class="dialog-body"><p class="overline">${type==='video'?'VÍDEO':'INCORPORAR CONTEÚDO'}</p><h2>Coloque sua criação em movimento.</h2><p>Use um link do YouTube ou Vimeo${type==='video'?', ou a URL HTTPS de um vídeo MP4 ou WebM':''}.</p><form id="media-form"><label for="media-url">Endereço do conteúdo</label><input type="url" id="media-url" name="url" value="${e(block?.src||'')}" placeholder="https://…" required><p class="form-error" id="media-error" role="alert"></p><div class="dialog-buttons"><button type="submit" class="btn btn-primary">Adicionar ao projeto</button></div></form></div>`,'small-dialog');
  document.querySelector('#media-form').onsubmit=event=>{event.preventDefault();const value=new FormData(event.target).get('url');let url;try{url=new URL(value);}catch{return;}
    const trusted=['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com','youtube-nocookie.com','player.vimeo.com','vimeo.com','www.vimeo.com'].includes(url.hostname);
    if(url.protocol!=='https:'||(!trusted&&!(type==='video'&&/\.(mp4|webm|ogg)$/i.test(url.pathname)))){document.querySelector('#media-error').textContent='Use um endereço HTTPS de YouTube, Vimeo ou um arquivo de vídeo compatível.';return;}
    if(block)block.src=value;else current.blocks.push({id:uid(),type,src:value,size:'full',align:'center'});markDirty();dialog.close();renderCanvas();};
}
function pickImages(action,multiple=false) {fileAction=action;filesInput.multiple=multiple;filesInput.value='';filesInput.click();}
async function imageData(file) {
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('Escolha uma imagem PNG, JPG, WebP ou GIF.');
  if(file.size>3*1024*1024)throw new Error(`A imagem ${file.name} ultrapassa 3 MB. Reduza o arquivo antes de enviar.`);
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'));reader.readAsDataURL(file);});
}
filesInput.addEventListener('change',async()=>{
  const files=[...filesInput.files];if(!files.length||!current||!fileAction)return;
  const action=fileAction;filesInput.disabled=true;uploading=true;root.inert=true;dialog.inert=true;let done=0;let block=action.id?current.blocks.find(b=>b.id===action.id):null;
  try{
    for(const file of files){if(action.type==='grid'&&(block?.images.length||0)>=12)throw new Error('Cada grade aceita até 12 fotos. Adicione outra grade para continuar.');toast(`Enviando imagem ${++done} de ${files.length}…`);const result=await api('upload',{method:'POST',body:{dataUrl:await imageData(file),name:file.name}});const image={src:result.url,alt:file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ')};
      if(action.type==='cover'){current.cover=result.url;current.coverAlt=image.alt;const altInput=dialog.querySelector('#cover-alt');if(altInput&&!altInput.value)altInput.value=image.alt;const picker=dialog.querySelector('.cover-picker');if(picker)picker.innerHTML=`<img id="settings-cover" src="${e(result.url)}" alt="Capa do projeto"><span class="cover-picker-overlay">${icon('image')} Trocar capa</span>`;}
      else if(action.type==='replace'){block.src=result.url;block.alt=image.alt;}
      else if(action.type==='grid'){if(!block){block={id:uid(),type:'grid',images:[],size:'full',align:'left'};current.blocks.push(block);}block.images.push(image);}
      else {current.blocks.push({id:uid(),type:'image',...image,size:'full',align:'left'});}
      markDirty();
    }
    toast('Imagens adicionadas. Salve para guardar as alterações.');
  }catch(error){toast(error.message,true);}
  finally{filesInput.disabled=false;uploading=false;root.inert=false;dialog.inert=false;renderCanvas();fileAction=null;}
});
async function moveProject(id,direction) {
  if(query||category||tab!=='all'){toast('Para organizar todo o portfólio, use a aba Todos e limpe os filtros.');return;}
  const original=[...projects];const index=projects.findIndex(p=>p.id===id);const target=index+direction;if(target<0||target>=projects.length)return;
  projects.splice(target,0,projects.splice(index,1)[0]);renderCards();
  try{await api('order',{method:'PUT',body:{ids:projects.map(p=>p.id)}});toast('Ordem do portfólio salva.');}catch(error){projects=original;renderCards();toast(error.message,true);}
}
async function leaveEditor() {if(dirty&&!await confirmAction('Sair sem salvar?','As alterações feitas desde o último salvamento serão descartadas.','Descartar alterações',true))return;renderDashboard();}

root.addEventListener('input',event=>{const el=event.target;if(el.dataset.textBlock){const block=current.blocks.find(b=>b.id===el.dataset.textBlock);block.text=el.value;el.style.height='auto';el.style.height=`${el.scrollHeight}px`;markDirty();}});
document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action],[data-tab],[data-view]');if(!target)return;
  if(busy||uploading){event.preventDefault();return;}
  if(target.dataset.tab){tab=target.dataset.tab;renderDashboard();return;}
  if(target.dataset.view){view=target.dataset.view;renderDashboard();return;}
  const action=target.dataset.action,id=target.dataset.id,blockId=target.dataset.blockId;const p=projects.find(p=>p.id===id);const block=current?.blocks.find(b=>b.id===blockId);
  try{
    if(action==='close-dialog'){dialog.close();return;}
    if(action==='show-password'){const input=document.querySelector('#password');input.type=input.type==='password'?'text':'password';target.setAttribute('aria-label',input.type==='password'?'Mostrar senha':'Ocultar senha');return;}
    if(action==='account'){showDialog(`<div class="dialog-body"><p class="overline">SEU ESTÚDIO</p><h2>Ícaro Braga</h2><p>Área privada de organização do portfólio.</p><button class="btn btn-outline" data-action="logout">${icon('logout')} Sair da conta</button></div>`,'small-dialog');return;}
    if(action==='logout'){if(dirty&&!await confirmAction('Sair sem salvar?','Suas alterações não salvas serão descartadas.','Sair',true))return;await api('logout',{method:'POST',body:{}});dialog.close();await boot();return;}
    if(action==='all-projects'||action==='draft-projects'){tab=action==='all-projects'?'all':'draft';renderDashboard();return;}
    if(action==='new'){newProject();return;}
    if(action==='edit'){current=structuredClone(p);dirty=false;renderEditor();return;}
    if(action==='back'){await leaveEditor();return;}
    if(action==='reorder'){reorder=!reorder;if(reorder){tab='all';query='';category='';}renderDashboard();return;}
    if(action==='duplicate'){const result=await api('duplicate',{method:'POST',id,body:{}});projects.splice(projects.findIndex(item=>item.id===id)+1,0,result.project);toast('Uma cópia foi criada nos rascunhos.');renderDashboard();return;}
    if(action==='delete'){if(!await confirmAction('Excluir este projeto?',`“${p.title}” será removido do estúdio e do portfólio. Esta ação não pode ser desfeita.`,'Excluir projeto',true))return;await api('project',{method:'DELETE',id});projects=projects.filter(item=>item.id!==id);renderDashboard();toast('Projeto excluído.');return;}
    if(action==='unpublish'){if(!await confirmAction('Mover para rascunhos?',`“${p.title}” deixará de aparecer no portfólio e ficará visível só para você.`,'Mover para rascunhos'))return;const result=await api('project',{method:'PUT',body:{...p,publication:'draft'}});projects[projects.findIndex(x=>x.id===id)]=result.project;renderDashboard();toast('Projeto movido para rascunhos.');return;}
    if(action==='project-up'||action==='project-down'){await moveProject(id,action==='project-up'?-1:1);return;}
    if(action==='settings'||action==='publish-settings'){settings(action==='publish-settings');return;}
    if(action==='styles'){stylesDialog();return;}
    if(action==='save'){if(await save())renderEditor();return;}
    if(action==='preview'){showDialog(`<div class="preview-bar"><strong>Prévia do projeto</strong><span>Esta visualização ainda não publica suas alterações.</span></div><div class="studio-preview">${renderPortfolioProject({...current,publication:'published'},base,[])}</div>`,'preview-dialog');return;}
    if(action==='choose-cover'){pickImages({type:'cover'});return;}
    if(action==='add-image'){pickImages({type:'images'},true);return;}
    if(action==='add-grid'){pickImages({type:'grid'},true);return;}
    if(action==='replace-image'){pickImages({type:'replace',id:blockId});return;}
    if(action==='grid-add'){pickImages({type:'grid',id:blockId},true);return;}
    if(action==='add-text'||action==='add-divider'){current.blocks.push({id:uid(),type:action.slice(4),text:'',format:'paragraph',align:'left',size:action==='add-text'?'normal':'full'});markDirty();renderCanvas();if(action==='add-text'){const el=document.querySelector(`[data-text-block="${current.blocks.at(-1).id}"]`);el.focus();}return;}
    if(action==='add-video'||action==='add-embed'){mediaDialog(action.slice(4));return;}
    if(action==='edit-media'){mediaDialog(block.type,blockId);return;}
    if(action==='block-settings'){blockSettings(blockId);return;}
    if(action==='block-delete'){if(!await confirmAction('Remover este bloco?','O bloco será removido deste projeto.','Remover bloco',true))return;current.blocks=current.blocks.filter(b=>b.id!==blockId);markDirty();renderCanvas();return;}
    if(action==='block-duplicate'){const index=current.blocks.indexOf(block);current.blocks.splice(index+1,0,{...structuredClone(block),id:uid()});markDirty();renderCanvas();return;}
    if(action==='block-up'||action==='block-down'){const index=current.blocks.indexOf(block),next=index+(action==='block-up'?-1:1);if(next>=0&&next<current.blocks.length){[current.blocks[index],current.blocks[next]]=[current.blocks[next],current.blocks[index]];markDirty();renderCanvas();}return;}
    if(action==='grid-remove'){block.images.splice(Number(target.dataset.index),1);if(!block.images.length)current.blocks=current.blocks.filter(b=>b.id!==blockId);markDirty();renderCanvas();return;}
    if(action==='grid-up'||action==='grid-down'){const i=Number(target.dataset.index),next=i+(action==='grid-up'?-1:1);if(next>=0&&next<block.images.length){[block.images[i],block.images[next]]=[block.images[next],block.images[i]];markDirty();renderCanvas();blockSettings(blockId);}return;}
  }catch(error){toast(error.message,true);}
});
root.addEventListener('dragstart',event=>{
  const handle=event.target.closest('[data-drag-block]');const card=event.target.closest('.studio-project-card');
  if(handle){dragging={type:'block',id:handle.dataset.dragBlock};event.dataTransfer.setData('text/plain',dragging.id);event.dataTransfer.effectAllowed='move';}
  else if(card&&reorder){dragging={type:'project',id:card.dataset.id};card.classList.add('is-dragging');event.dataTransfer.setData('text/plain',dragging.id);event.dataTransfer.effectAllowed='move';}
});
root.addEventListener('dragover',event=>{if(!dragging)return;const el=event.target.closest(dragging.type==='block'?'.canvas-block':'.studio-project-card');if(el){event.preventDefault();event.dataTransfer.dropEffect='move';el.classList.add('drag-over');}});
root.addEventListener('dragleave',event=>event.target.closest('.drag-over')?.classList.remove('drag-over'));
root.addEventListener('dragend',()=>{dragging=null;document.querySelectorAll('.drag-over,.is-dragging').forEach(el=>el.classList.remove('drag-over','is-dragging'));});
root.addEventListener('drop',async event=>{
  if(!dragging)return;event.preventDefault();const drag=dragging;dragging=null;
  if(drag.type==='block'){const target=event.target.closest('.canvas-block')?.dataset.block;const from=current.blocks.findIndex(b=>b.id===drag.id),to=current.blocks.findIndex(b=>b.id===target);if(from>=0&&to>=0&&from!==to){current.blocks.splice(to,0,current.blocks.splice(from,1)[0]);markDirty();}renderCanvas();}
  else {const target=event.target.closest('.studio-project-card')?.dataset.id;const from=projects.findIndex(p=>p.id===drag.id),to=projects.findIndex(p=>p.id===target);if(from<0||to<0||from===to){renderCards();return;}await moveProject(drag.id,to-from);}
});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&current){event.preventDefault();if(!dialog.open)save().then(ok=>{if(ok)renderEditor();});}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
boot();

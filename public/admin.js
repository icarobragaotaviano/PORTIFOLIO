import { createCms, bytesToBase64, checkImage } from './github-cms.js';
import { validatePortfolio } from './content-schema.js';

const $ = (selector) => document.querySelector(selector);
const form = $('#job-form');
const cms = createCms();
const base = document.body.dataset.base || '/';
const state = { data: { projects: [] }, snapshot: null, baseline: '', uploads: new Map(), urls: new Map(), selected: -1, draft: null, formDirty: false, busy: false, authenticated: false };
const fields = ['title', 'slug', 'subtitle', 'category', 'year', 'status', 'alt', 'intro', 'challenge', 'concept', 'solution', 'services', 'deliverables', 'note'];
const dirty = () => JSON.stringify(state.data) !== state.baseline;
function notify(message, error = false) { const el = $('#notice'); el.replaceChildren(); el.textContent = message; el.classList.toggle('error', error); }
function refreshActions() { $('#publish').disabled = state.busy || !dirty() || !state.snapshot; $('#export').disabled = state.busy || !state.authenticated; }
const previouslyDisabled = new Map();
function busy(value) {
  state.busy = value;
  document.body.classList.toggle('busy', value);
  if (value) document.querySelectorAll('button,input,textarea,select').forEach((el) => { previouslyDisabled.set(el, el.disabled); el.disabled = true; });
  else { previouslyDisabled.forEach((disabled, el) => { el.disabled = disabled; }); previouslyDisabled.clear(); }
  refreshActions();
}
function imageSrc(path) { return state.urls.get(path) || `${base}${String(path || '').replace(/^\//, '')}`; }
function releaseImages() { state.urls.forEach((url) => URL.revokeObjectURL(url)); state.urls.clear(); state.uploads.clear(); }
function pruneUploads() {
  const projects = [...state.data.projects, ...(state.draft ? [state.draft] : [])];
  const used = new Set(projects.flatMap((project) => [project.image, ...(project.gallery || []).map((entry) => entry.image)]));
  for (const path of state.uploads.keys()) {
    if (used.has(path)) continue;
    const url = state.urls.get(path); if (url) URL.revokeObjectURL(url);
    state.urls.delete(path); state.uploads.delete(path);
  }
}
function make(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function abandonForm() { return !state.formDirty || window.confirm('Descartar as alterações deste job que ainda não foram salvas no painel?'); }
function closeEditor({ prune = true } = {}) { state.selected = -1; state.draft = null; state.formDirty = false; if (prune) pruneUploads(); form.hidden = true; $('#empty-editor').hidden = false; renderList(); renderPreview(); }
function renderList() {
  const list = $('#job-list'); list.replaceChildren(); $('#job-count').textContent = state.data.projects.length;
  state.data.projects.forEach((project, index) => {
    const item = make('li', undefined, `job-item${index === state.selected ? ' active' : ''}`);
    const select = make('button', project.title, 'job-select'); select.type = 'button'; select.append(make('span', `${String(index + 1).padStart(2, '0')} / ${project.category}`)); select.addEventListener('click', () => { if (abandonForm()) edit(index); }); item.append(select);
    const actions = make('div', undefined, 'job-actions');
    [['↑', -1, 'Mover para cima'], ['↓', 1, 'Mover para baixo']].forEach(([text, offset, label]) => {
      const button = make('button', text); button.type = 'button'; button.setAttribute('aria-label', `${label}: ${project.title}`); button.disabled = index + offset < 0 || index + offset >= state.data.projects.length;
      button.addEventListener('click', () => { if (!abandonForm()) return; const other = index + offset; [state.data.projects[index], state.data.projects[other]] = [state.data.projects[other], state.data.projects[index]]; closeEditor(); refreshActions(); notify('Ordem atualizada no painel. Publique para aplicar ao portfólio.'); }); actions.append(button);
    });
    const remove = make('button', 'Remover', 'delete'); remove.type = 'button'; remove.setAttribute('aria-label', `Remover ${project.title}`);
    remove.addEventListener('click', () => { if (!abandonForm() || !window.confirm(`Remover “${project.title}” do portfólio? A alteração será aplicada quando você publicar.`)) return; state.data.projects.splice(index, 1); closeEditor(); refreshActions(); notify('Job removido do painel. Publique para aplicar ao portfólio.'); }); actions.append(remove); item.append(actions); list.append(item);
  });
}
function edit(index = -1, restoredDraft = null) {
  state.selected = index;
  state.draft = restoredDraft ? structuredClone(restoredDraft) : index >= 0 ? structuredClone(state.data.projects[index]) : { slug: '', title: '', subtitle: '', category: '', year: '', number: '', status: 'published', image: '', alt: '', services: [], intro: '', challenge: '', concept: '', solution: '', deliverables: [], note: '', gallery: [] };
  state.draft.gallery ||= [];
  delete form.elements.slug.dataset.edited;
  fields.forEach((name) => { form.elements[name].value = ['services', 'deliverables'].includes(name) ? (state.draft[name] || []).join('\n') : state.draft[name] || ''; });
  $('#cover-file').value = ''; $('#gallery-files').value = ''; state.formDirty = false; form.hidden = false; $('#empty-editor').hidden = true; $('#editor-title').textContent = index >= 0 ? 'Editar trabalho' : 'Novo trabalho'; pruneUploads(); renderGallery(); renderList(); renderPreview(); $('#editor-title').focus();
}
function captureForm() {
  if (!state.draft) return null;
  const project = { ...state.draft };
  fields.forEach((name) => { const value = form.elements[name].value.trim(); project[name] = ['services', 'deliverables'].includes(name) ? value.split('\n').map((entry) => entry.trim()).filter(Boolean) : value; });
  if (project.status === 'placeholder' && !project.image) project.image = null;
  return project;
}
function renderPreview() {
  const project = captureForm();
  $('#preview-title').textContent = project?.title || 'Um novo trabalho.';
  $('#preview-category').textContent = project?.category || '';
  $('#preview-subtitle').textContent = project?.subtitle || 'O próximo case começa com uma boa história.';
  $('#preview-intro').textContent = project?.intro || '';
  const preview = $('#preview-image'); const cover = $('#cover-preview');
  [preview, cover].forEach((img) => { img.hidden = !project?.image; if (project?.image) { img.src = imageSrc(project.image); img.alt = project.alt || 'Prévia da capa'; } else img.removeAttribute('src'); });
}
function renderGallery() {
  const list = $('#gallery-list'); list.replaceChildren();
  (state.draft?.gallery || []).forEach((entry, index) => {
    const wrap = make('div', undefined, 'gallery-item'); const img = make('img'); img.src = imageSrc(entry.image); img.alt = entry.alt || 'Prévia da imagem'; wrap.append(img);
    const label = make('label', `Descrição da imagem ${index + 1}`); const input = make('input'); input.value = entry.alt || ''; input.maxLength = 500; input.required = true; input.addEventListener('input', () => { entry.alt = input.value; state.formDirty = true; }); label.append(input); wrap.append(label);
    const actions = make('div', undefined, 'job-actions');
    [['↑', -1], ['↓', 1]].forEach(([text, offset]) => { const button = make('button', text); button.type = 'button'; button.setAttribute('aria-label', `Mover imagem ${index + 1} ${offset < 0 ? 'para cima' : 'para baixo'}`); button.disabled = index + offset < 0 || index + offset >= state.draft.gallery.length; button.addEventListener('click', () => { const other = index + offset; [state.draft.gallery[index], state.draft.gallery[other]] = [state.draft.gallery[other], state.draft.gallery[index]]; state.formDirty = true; renderGallery(); }); actions.append(button); });
    const remove = make('button', 'Remover imagem', 'delete'); remove.type = 'button'; remove.addEventListener('click', () => { state.draft.gallery.splice(index, 1); state.formDirty = true; pruneUploads(); renderGallery(); }); actions.append(remove); wrap.append(actions); list.append(wrap);
  });
}
async function assertDecodableImage(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('Esta imagem está danificada ou não pode ser lida. Escolha outro arquivo.'); }
  try { if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 80000000) throw new Error('Use uma imagem com até 80 megapixels.'); }
  finally { bitmap.close(); }
}
async function stageImage(file) {
  pruneUploads();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = checkImage(bytes, file.type);
  await assertDecodableImage(file);
  const total = [...state.uploads.values()].reduce((sum, item) => sum + item.size, 0);
  if (total + file.size > 12 * 1024 * 1024) throw new Error('O lote de imagens deve ter até 12 MB. Publique este lote antes de adicionar mais imagens.');
  const name = `job-${crypto.randomUUID()}.${extension}`; const path = `/uploads/${name}`;
  state.uploads.set(path, { path: `public/uploads/${name}`, content: bytesToBase64(bytes), size: bytes.length });
  state.urls.set(path, URL.createObjectURL(file));
  return path;
}
async function reload() {
  const snapshot = await cms.load(); validatePortfolio(snapshot.data);
  releaseImages(); state.snapshot = snapshot; state.data = structuredClone(snapshot.data); state.baseline = JSON.stringify(state.data); closeEditor(); refreshActions();
}
$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); let credential = $('#token').value; $('#token').value = ''; busy(true); notify('Conectando à sua conta…');
  try {
    await cms.authenticate(credential); credential = ''; await reload(); state.authenticated = true; $('#login-panel').hidden = true; $('#workspace').hidden = false; $('#logout').hidden = false; notify('Seu painel está pronto.');
  } catch (error) { credential = ''; cms.logout(); notify(error.message, true); }
  finally { busy(false); }
});
$('#logout').addEventListener('click', () => {
  if ((dirty() || state.formDirty) && !window.confirm('Sair e descartar as alterações ainda não publicadas?')) return;
  cms.logout(); releaseImages(); state.authenticated = false; state.data = { projects: [] }; state.snapshot = null; state.baseline = ''; closeEditor(); $('#workspace').hidden = true; $('#logout').hidden = true; $('#login-panel').hidden = false; $('#token').value = ''; notify('Você saiu. A credencial foi removida desta aba.'); $('#token').focus();
});
$('#new-job').addEventListener('click', () => { if (state.data.projects.length >= 100) { notify('O portfólio aceita até 100 jobs.', true); return; } if (abandonForm()) edit(); });
$('#cancel-edit').addEventListener('click', () => { if (abandonForm()) closeEditor(); });
form.addEventListener('input', (event) => {
  state.formDirty = true;
  if (event.target.name === 'title' && state.selected === -1 && !form.elements.slug.dataset.edited) form.elements.slug.value = event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  if (event.target.name === 'slug') form.elements.slug.dataset.edited = 'true';
  renderPreview();
});
form.addEventListener('submit', (event) => {
  event.preventDefault(); const project = captureForm(); if (!project) return;
  const next = structuredClone(state.data); if (state.selected < 0) next.projects.push(project); else next.projects[state.selected] = project;
  next.projects.forEach((job, index) => { job.number = String(index + 1).padStart(2, '0'); });
  try { validatePortfolio(next); } catch (error) { notify(error.message, true); return; }
  state.data = next; const index = state.selected < 0 ? next.projects.length - 1 : state.selected; state.formDirty = false; edit(index); refreshActions(); notify('Job salvo neste painel. Publique as alterações para enviar ao portfólio.');
});
$('#cover-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file || !state.draft) return; busy(true);
  try { state.draft.image = await stageImage(file); state.formDirty = true; pruneUploads(); renderPreview(); notify('Capa adicionada. Escreva a descrição e salve o job.'); }
  catch (error) { notify(error.message, true); } finally { event.target.value = ''; busy(false); }
});
$('#gallery-files').addEventListener('change', async (event) => {
  const files = [...event.target.files]; if (!files.length || !state.draft) return;
  if ((state.draft.gallery?.length || 0) + files.length > 8) { notify('Cada case aceita até 8 imagens na galeria.', true); event.target.value = ''; return; }
  busy(true); state.draft.gallery ||= [];
  try { for (const file of files) { const image = await stageImage(file); state.draft.gallery.push({ image, alt: '' }); state.formDirty = true; } notify('Imagens adicionadas. Descreva cada uma e salve o job.'); }
  catch (error) { notify(error.message, true); } finally { event.target.value = ''; renderGallery(); busy(false); }
});
$('#reload').addEventListener('click', async () => {
  if ((dirty() || state.formDirty) && !window.confirm('Recarregar e descartar as alterações ainda não publicadas? Exporte um backup primeiro se quiser preservá-las.')) return;
  busy(true); try { await reload(); notify('Jobs atualizados a partir do GitHub.'); } catch (error) { notify(error.message, true); } finally { busy(false); }
});
$('#publish').addEventListener('click', async () => {
  if (state.formDirty) { notify('Salve ou cancele a edição do job antes de publicar.', true); return; }
  try { validatePortfolio(state.data); } catch (error) { notify(error.message, true); return; }
  const used = new Set(state.data.projects.flatMap((project) => [project.image, ...(project.gallery || []).map((item) => item.image)]));
  const uploads = [...state.uploads.entries()].filter(([path]) => used.has(path)).map(([, item]) => ({ path: item.path, content: item.content }));
  busy(true); notify('Publicando jobs e imagens no GitHub…');
  try {
    const result = await cms.publish(state.data, state.snapshot, uploads); state.baseline = JSON.stringify(state.data); state.snapshot = null;
    const notice = $('#notice'); notice.classList.remove('error'); notice.replaceChildren(make('span', 'Alterações salvas no GitHub. A atualização do site depende da publicação da hospedagem. ')); const link = make('a', 'Ver commit ↗'); link.href = result.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; notice.append(link);
    try { const snapshot = await cms.load(); validatePortfolio(snapshot.data); state.snapshot = snapshot; state.data = structuredClone(snapshot.data); state.baseline = JSON.stringify(state.data); releaseImages(); closeEditor(); } catch { notice.append(make('span', ' Recarregue os jobs antes de editar novamente.')); }
  } catch (error) { notify(error.message, true); } finally { busy(false); }
});
$('#export').addEventListener('click', () => {
  const bundle = { format: 'icaro-portfolio-backup-v1', portfolio: state.data, draft: state.formDirty ? captureForm() : null, draftIndex: state.selected, uploads: [...state.uploads.values()].map(({ path, content }) => ({ path, content })) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })); const link = make('a'); link.href = url; link.download = 'portfolio-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Backup exportado com os jobs e as imagens desta aba.');
});
$('#restore').addEventListener('click', () => $('#restore-file').click());
$('#restore-file').addEventListener('change', async (event) => {
  const file = event.target.files[0]; if (!file) return;
  if ((dirty() || state.formDirty) && !window.confirm('Substituir as alterações desta aba pelo backup?')) { event.target.value = ''; return; }
  busy(true);
  try {
    if (file.size > 18 * 1024 * 1024) throw new Error('O backup deve ter até 18 MB.');
    const bundle = JSON.parse(await file.text());
    if (bundle.format !== 'icaro-portfolio-backup-v1') throw new Error('Este arquivo não é um backup do painel.');
    validatePortfolio(bundle.portfolio);
    if (!Array.isArray(bundle.uploads) || bundle.uploads.length > 40) throw new Error('O backup contém um lote de imagens inválido.');
    let total = 0; const recovered = []; const paths = new Set();
    for (const item of bundle.uploads) {
      const match = /^public\/uploads\/[a-z0-9-]+\.(png|jpg|webp)$/.exec(item.path);
      if (!match || paths.has(item.path)) throw new Error('O backup contém um caminho de imagem inválido.');
      paths.add(item.path); const bytes = Uint8Array.from(atob(item.content), (char) => char.charCodeAt(0));
      const mime = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[match[1]];
      checkImage(bytes, mime); await assertDecodableImage(new Blob([bytes], { type: mime })); total += bytes.length; if (total > 12 * 1024 * 1024) throw new Error('O lote de imagens deve ter até 12 MB.');
      recovered.push({ ...item, bytes, mime });
    }
    if (bundle.draft) {
      if (typeof bundle.draft !== 'object' || !Array.isArray(bundle.draft.gallery || []) || (bundle.draft.gallery || []).length > 8) throw new Error('A edição pendente do backup é inválida.');
      const draft = bundle.draft;
      for (const name of fields) {
        if (['services', 'deliverables'].includes(name)) { if (!Array.isArray(draft[name]) || draft[name].length > 24 || draft[name].some((entry) => typeof entry !== 'string' || entry.length > 240)) throw new Error('A edição pendente do backup é inválida.'); }
        else if (typeof draft[name] !== 'string' || draft[name].length > 6000) throw new Error('A edição pendente do backup é inválida.');
      }
      const validPath = (path) => !path || (typeof path === 'string' && !path.includes('..') && /^\/(images|uploads)\/[a-zA-Z0-9_/-]+\.(svg|png|jpe?g|webp)$/.test(path));
      if (!validPath(draft.image) || (draft.gallery || []).some((entry) => !entry || !validPath(entry.image) || typeof entry.alt !== 'string' || entry.alt.length > 600)) throw new Error('As imagens da edição pendente são inválidas.');
    }
    releaseImages();
    recovered.forEach((item) => { const path = item.path.replace(/^public/, ''); state.uploads.set(path, { path: item.path, content: item.content, size: item.bytes.length }); state.urls.set(path, URL.createObjectURL(new Blob([item.bytes], { type: item.mime }))); });
    state.data = structuredClone(bundle.portfolio); closeEditor({ prune: !bundle.draft });
    if (bundle.draft) {
      const index = Number.isInteger(bundle.draftIndex) && bundle.draftIndex >= 0 && bundle.draftIndex < state.data.projects.length ? bundle.draftIndex : -1;
      edit(index, bundle.draft);
      state.formDirty = true; renderGallery(); renderPreview();
    }
    refreshActions(); notify('Backup restaurado nesta aba. Revise os jobs antes de publicar.');
  } catch (error) { notify(error instanceof SyntaxError ? 'O arquivo de backup não é um JSON válido.' : error.message, true); }
  finally { event.target.value = ''; busy(false); }
});
window.addEventListener('beforeunload', (event) => { if (state.authenticated && (dirty() || state.formDirty)) { event.preventDefault(); event.returnValue = ''; } });

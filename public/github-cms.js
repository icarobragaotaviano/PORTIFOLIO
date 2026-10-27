import { validatePortfolio } from './content-schema.js';
export const CMS_CONFIG = Object.freeze({ owner: 'icarobragaotaviano', repo: 'PORTIFOLIO', branch: 'main', path: 'src/portfolio.json' });
export class CmsError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'CmsError'; this.status = status; }
}
const utf8 = new TextEncoder();
export function encodeText(text) { return bytesToBase64(utf8.encode(text)); }
export function decodeText(base64) { return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (c) => c.charCodeAt(0))); }
export function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
export function checkImage(bytes, mime) {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) throw new CmsError('Cada imagem deve ter até 3 MB.');
  const isPng = [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value);
  const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isWebp = String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  if (mime === 'image/png' && isPng) return 'png';
  if (mime === 'image/jpeg' && isJpeg) return 'jpg';
  if (mime === 'image/webp' && isWebp) return 'webp';
  throw new CmsError('Escolha uma imagem válida em JPG, PNG ou WebP.');
}
export function createCms({ fetchImpl = globalThis.fetch, config = CMS_CONFIG } = {}) {
  let token = '';
  let authenticated = false;
  const repoPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  const ref = encodeURIComponent(config.branch);
  async function request(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetchImpl(`https://api.github.com${path}`, {
        method, cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new CmsError('Não foi possível conectar ao GitHub. Confira sua conexão e tente novamente.'); }
    if (!response.ok) {
      const status = response.status;
      let message = 'O GitHub não conseguiu concluir esta operação.';
      if (status === 401) message = 'A credencial expirou ou não é válida. Entre novamente.';
      if (status === 403) message = response.headers?.get('x-ratelimit-remaining') === '0' ? 'O limite de acesso ao GitHub foi atingido. Aguarde antes de tentar novamente.' : 'O acesso foi recusado. Confira a permissão Contents: Read and write para este repositório.';
      if (status === 404) message = 'Arquivo ou repositório indisponível. Confira se a credencial tem acesso ao PORTIFOLIO e se esta versão já foi integrada à branch main.';
      if (status === 409 || status === 422) message = 'O repositório mudou ou bloqueou esta publicação. Recarregue os jobs antes de publicar novamente.';
      throw new CmsError(message, status);
    }
    return response.status === 204 ? null : response.json();
  }
  function requireSession() { if (!authenticated || !token) throw new CmsError('Entre na sua conta para continuar.', 401); }
  function logout() { token = ''; authenticated = false; }
  async function authenticate(value) {
    logout(); token = String(value || '').trim();
    if (!token) throw new CmsError('Informe sua credencial do GitHub.');
    try {
      const user = await request('/user');
      if (String(user.login).toLowerCase() !== config.owner.toLowerCase()) throw new CmsError('Esta área é exclusiva da conta de Ícaro Braga.', 403);
      const repo = await request(repoPath);
      if (repo.permissions?.push !== true || String(repo.owner?.login).toLowerCase() !== config.owner.toLowerCase()) throw new CmsError('Esta credencial não permite editar o PORTIFOLIO.', 403);
      authenticated = true;
      return { login: user.login, name: user.name || user.login };
    } catch (error) { logout(); throw error; }
  }
  async function load() {
    requireSession();
    const branch = await request(`${repoPath}/git/ref/heads/${ref}`);
    const head = branch.object.sha;
    const file = await request(`${repoPath}/contents/${config.path}?ref=${encodeURIComponent(head)}`);
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new CmsError('O arquivo de jobs não pode ser lido.');
    let data;
    try { data = JSON.parse(decodeText(file.content)); } catch { throw new CmsError('O arquivo de jobs está inválido. Revise src/portfolio.json no repositório.'); }
    const commit = await request(`${repoPath}/git/commits/${head}`);
    return { data, head, fileSha: file.sha, tree: commit.tree.sha };
  }
  async function publish(data, snapshot, uploads = []) {
    requireSession();
    validatePortfolio(data);
    if (!snapshot?.head || !snapshot?.tree || !snapshot?.fileSha) throw new CmsError('Recarregue os jobs antes de publicar.');
    if (!Array.isArray(uploads) || uploads.length > 40) throw new CmsError('Publique um lote menor de imagens por vez.');
    let totalBytes = 0;
    const paths = new Set();
    for (const upload of uploads) {
      const match = /^public\/uploads\/[a-z0-9-]+\.(png|jpg|webp)$/.exec(upload.path);
      if (!match || paths.has(upload.path)) throw new CmsError('Caminho de imagem inválido ou duplicado.');
      paths.add(upload.path);
      let bytes;
      try { bytes = Uint8Array.from(atob(upload.content), (char) => char.charCodeAt(0)); } catch { throw new CmsError('Arquivo de imagem inválido.'); }
      checkImage(bytes, { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[match[1]]);
      totalBytes += bytes.length;
    }
    if (totalBytes > 12 * 1024 * 1024) throw new CmsError('O lote de imagens deve ter até 12 MB.');
    const current = await request(`${repoPath}/git/ref/heads/${ref}`);
    if (current.object.sha !== snapshot.head) throw new CmsError('Há alterações mais recentes no repositório. Exporte suas alterações e recarregue os jobs antes de publicar.', 409);
    const tree = [{ path: config.path, mode: '100644', type: 'blob', content: `${JSON.stringify(data, null, 2)}\n` }];
    for (const upload of uploads) {
      if (!/^public\/uploads\/[a-z0-9-]+\.(png|jpg|webp)$/.test(upload.path)) throw new CmsError('Caminho de imagem inválido.');
      const blob = await request(`${repoPath}/git/blobs`, { method: 'POST', body: { content: upload.content, encoding: 'base64' } });
      tree.push({ path: upload.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const createdTree = await request(`${repoPath}/git/trees`, { method: 'POST', body: { base_tree: snapshot.tree, tree } });
    const commit = await request(`${repoPath}/git/commits`, { method: 'POST', body: { message: 'Atualiza trabalhos pelo painel de Ícaro Braga', tree: createdTree.sha, parents: [snapshot.head] } });
    try {
      await request(`${repoPath}/git/refs/heads/${ref}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (error) {
      // A lost response can happen after GitHub accepted the write. Verify the branch before retrying.
      if (error.status) throw error;
      try {
        const verified = await request(`${repoPath}/git/ref/heads/${ref}`);
        if (verified.object.sha === commit.sha) return { sha: commit.sha, url: `https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}` };
      } catch { /* Preserve an explicit uncertain result, never claim success. */ }
      throw new CmsError('A conexão caiu durante a publicação. Confira o último commit no GitHub e recarregue os jobs antes de tentar novamente.');
    }
    return { sha: commit.sha, url: `https://github.com/${config.owner}/${config.repo}/commit/${commit.sha}` };
  }
  return { authenticate, load, publish, logout };
}

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';

const clone = value => structuredClone(value);
const queues = new Map();

export class PortfolioStoreError extends Error {}

/** Atomic disk persistence locally, optimistic Redis transactions on deployments. */
export function createPortfolioStore({ env = process.env, dataDir = resolve(process.cwd(), '.data/portfolio'), seed = [] } = {}) {
  const directory = resolve(dataDir);
  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const cloud = Boolean(redisUrl && redisToken);
  const production = Boolean(env.VERCEL || env.VERCEL_ENV || env.AWS_LAMBDA_FUNCTION_NAME);
  const partialCloud = Boolean(redisUrl || redisToken) && !cloud;
  const writable = !partialCloud && (cloud || !production);
  const key = 'portfolio:v1:state';
  const initial = () => ({ version: 1, projects: clone(seed) });
  const statePath = join(directory, 'projects.json');
  const credentialPath = join(directory, 'credentials.json');

  async function redis(command) {
    let target;
    try { target = new URL(redisUrl); } catch { throw new PortfolioStoreError('Armazenamento remoto inválido.'); }
    if (target.protocol !== 'https:' || target.username || target.password) throw new PortfolioStoreError('Armazenamento remoto inválido.');
    let response;
    try {
      response = await fetch(target, {
        method: 'POST', headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(command), signal: AbortSignal.timeout(12000),
      });
      const body = await response.json();
      if (!response.ok || body.error) throw new Error('redis');
      return body.result;
    } catch { throw new PortfolioStoreError('Não foi possível acessar o armazenamento remoto.'); }
  }

  async function readJson(path, fallback) {
    try { return JSON.parse(await readFile(path, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return fallback; throw new PortfolioStoreError('Não foi possível ler os dados do portfólio.'); }
  }

  async function atomicJson(path, value) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomBytes(12).toString('hex')}.tmp`;
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  }

  async function localQueue(task) {
    const previous = queues.get(directory) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    queues.set(directory, next);
    try { return await next; }
    finally { if (queues.get(directory) === next) queues.delete(directory); }
  }

  function requireWritable() {
    if (!writable) throw new PortfolioStoreError('Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN para salvar o portfólio nesta hospedagem.');
  }

  function validState(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.projects)) throw new PortfolioStoreError('Os dados do portfólio precisam ser verificados.');
    return value;
  }

  return {
    writable, cloud, production,
    async read() {
      if (partialCloud) throw new PortfolioStoreError('A configuração do armazenamento remoto está incompleta.');
      if (cloud) {
        const raw = await redis(['GET', key]);
        if (raw === null) return initial();
        try { return validState(JSON.parse(raw)); } catch { throw new PortfolioStoreError('Os dados do portfólio precisam ser verificados.'); }
      }
      // Ephemeral deployment files must never masquerade as saved portfolio data.
      return production ? initial() : validState(await readJson(statePath, initial()));
    },
    async mutate(change) {
      requireWritable();
      if (cloud) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const raw = await redis(['GET', key]);
          let state;
          try { state = raw === null ? initial() : validState(JSON.parse(raw)); }
          catch { throw new PortfolioStoreError('Os dados do portfólio precisam ser verificados.'); }
          const result = change(state);
          const saved = await redis(['EVAL', "local old = redis.call('GET', KEYS[1]); if (old == false and ARGV[1] == '__MISSING__') or old == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]); return 1 end; return 0", 1, key, raw === null ? '__MISSING__' : raw, JSON.stringify(state)]);
          if (Number(saved) === 1) return clone(result);
        }
        throw new PortfolioStoreError('Outro salvamento está em andamento. Tente novamente.');
      }
      return localQueue(async () => {
        const state = validState(await readJson(statePath, initial()));
        const result = change(state);
        await atomicJson(statePath, state);
        return clone(result);
      });
    },
    async readLocalCredentials() {
      if (production || cloud) return null;
      return readJson(credentialPath, null);
    },
    async setupLocalCredentials(credentials) {
      requireWritable();
      if (production || cloud) throw new PortfolioStoreError('Defina a senha e o segredo de sessão nas variáveis da hospedagem.');
      return localQueue(async () => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        try { await writeFile(credentialPath, JSON.stringify(credentials), { mode: 0o600, flag: 'wx' }); }
        catch (error) { if (error.code === 'EEXIST') return false; throw error; }
        return true;
      });
    },
    async writeAsset(id, asset) {
      requireWritable();
      if (!/^[a-f0-9]{32}$/.test(id)) throw new PortfolioStoreError('Identificador de imagem inválido.');
      if (cloud) return redis(['SET', `portfolio:v1:asset:${id}`, JSON.stringify(asset)]);
      await mkdir(join(directory, 'assets'), { recursive: true, mode: 0o700 });
      await writeFile(join(directory, 'assets', `${id}.json`), JSON.stringify(asset), { mode: 0o600, flag: 'wx' });
    },
    async readAsset(id) {
      if (!/^[a-f0-9]{32}$/.test(id)) return null;
      if (cloud) {
        const raw = await redis(['GET', `portfolio:v1:asset:${id}`]);
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch { throw new PortfolioStoreError('Imagem armazenada inválida.'); }
      }
      return production ? null : readJson(join(directory, 'assets', `${id}.json`), null);
    },
  };
}

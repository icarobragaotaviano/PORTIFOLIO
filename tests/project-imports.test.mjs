import test from 'node:test';
import assert from 'node:assert/strict';
import { importSuppliedProjects } from '../public/project-imports.js';

const PROJECTS_KEY = 'ib_studio_projects_v1';
const IMPORT_KEY = 'ib_studio_import_judo_jorge_queiroz_v1';
const judo = { id: 'judo-supplied', slug: 'judo-jorge-queiroz', title: 'Jorge Queiroz Judô', status: 'published' };
const other = { id: 'other', slug: 'outro-case', title: 'Outro case', status: 'published' };
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('importa somente o novo case, uma vez, preservando rascunhos, edições e ordem', () => {
  const saved = [
    { id: 'draft', slug: 'rascunho', title: 'Meu rascunho', status: 'draft' },
    { id: 'edited', slug: 'wine-gourmet', title: 'Título que editei', blocks: [{ text: 'Texto editado' }] },
  ];
  const storage = memoryStorage();
  const next = importSuppliedProjects(saved, [other, judo], storage);
  assert.deepEqual(next, [...saved, judo]);
  assert.strictEqual(next[0], saved[0]);
  assert.strictEqual(next[1], saved[1]);
  assert.equal(saved.length, 2);
  assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)), next);
  assert.equal(storage.getItem(IMPORT_KEY), '1');
  assert.strictEqual(importSuppliedProjects(next, [judo], storage), next);
});

test('não duplica nem altera um case existente, inclusive quando virou rascunho', () => {
  for (const existing of [
    { ...judo, id: 'local-id', status: 'draft', title: 'Título local' },
    { ...judo, slug: 'endereco-editado', status: 'draft', title: 'Título local' },
  ]) {
    const saved = [other, existing];
    const storage = memoryStorage({ [PROJECTS_KEY]: JSON.stringify(saved) });
    assert.strictEqual(importSuppliedProjects(saved, [judo], storage), saved);
    assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)), saved);
    assert.equal(storage.getItem(IMPORT_KEY), '1');
  }
});

test('uma resposta sem o case não marca a importação e permite tentar depois', () => {
  const saved = [other], storage = memoryStorage();
  for (const incoming of [[], [other], null]) {
    assert.strictEqual(importSuppliedProjects(saved, incoming, storage), saved);
    assert.equal(storage.getItem(IMPORT_KEY), null);
  }
  assert.deepEqual(importSuppliedProjects(saved, [judo], storage), [other, judo]);
});

test('um case excluído depois da importação permanece excluído', () => {
  const storage = memoryStorage();
  importSuppliedProjects([other], [judo], storage);
  const afterDeletion = [other];
  storage.setItem(PROJECTS_KEY, JSON.stringify(afterDeletion));
  assert.strictEqual(importSuppliedProjects(afterDeletion, [judo], storage), afterDeletion);
  assert.deepEqual(JSON.parse(storage.getItem(PROJECTS_KEY)), afterDeletion);
});

test('falhas no armazenamento não interrompem o fluxo nem marcam uma gravação perdida', () => {
  const saved = [other], storage = memoryStorage();
  const originalSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === PROJECTS_KEY) throw new Error('Sem espaço');
    originalSet(key, value);
  };
  assert.strictEqual(importSuppliedProjects(saved, [judo], storage), saved);
  assert.equal(storage.getItem(IMPORT_KEY), null);
  assert.equal(storage.getItem(PROJECTS_KEY), null);
  assert.strictEqual(importSuppliedProjects(saved, [judo], {
    getItem() { throw new Error('Acesso bloqueado'); },
    setItem() { assert.fail('Não deve gravar após falha de leitura'); },
  }), saved);
});

test('uma falha ao marcar não duplica o projeto que já foi salvo', () => {
  const storage = memoryStorage(), originalSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === IMPORT_KEY) throw new Error('Falha ao marcar');
    originalSet(key, value);
  };
  const next = importSuppliedProjects([other], [judo], storage);
  assert.deepEqual(next, [other, judo]);
  assert.equal(storage.getItem(IMPORT_KEY), null);
  const persisted = JSON.parse(storage.getItem(PROJECTS_KEY));
  assert.strictEqual(importSuppliedProjects(persisted, [judo], storage), persisted);
  assert.equal(persisted.length, 2);
});

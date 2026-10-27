import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePortfolio } from '../public/content-schema.js';

const job = () => ({
  slug: 'um-job', title: 'Um job', category: 'Identidade visual', year: '2026',
  status: 'published', image: '/uploads/capa.webp', alt: 'Capa do trabalho',
  intro: 'Um trabalho real.', services: ['Design'], deliverables: ['Identidade'],
});

test('conteúdo aceita trabalhos reais, exemplos identificados e uma seleção vazia', () => {
  assert.equal(validatePortfolio({ projects: [job()] }).projects.length, 1);
  assert.deepEqual(validatePortfolio({ projects: [] }), { projects: [] });
  assert.doesNotThrow(() => validatePortfolio({ projects: [{ ...job(), status: 'demo', note: 'Exemplo fictício.' }] }));
});

test('conteúdo recusa injeção de caminhos, URLs remotas e galerias sem descrição', () => {
  for (const image of ['/uploads/../segredo.png', '//example.com/a.png', 'javascript:alert(1)', 'https://example.com/a.jpg', '/uploads/a.svg', '/images/%2e%2e/a.png']) {
    assert.throws(() => validatePortfolio({ projects: [{ ...job(), image }] }));
  }
  assert.throws(() => validatePortfolio({ projects: [{ ...job(), gallery: [{ image: '/uploads/a.jpg', alt: '' }] }] }));
});

test('conteúdo protege URLs únicas, campos obrigatórios e notas de exemplos', () => {
  assert.throws(() => validatePortfolio({ projects: [job(), job()] }), /duplicado/);
  for (const update of [{ slug: '../fora' }, { title: '' }, { intro: '' }, { status: 'draft' }, { status: 'demo' }, { services: 'Design' }, { gallery: Array(9).fill({ image: '/uploads/a.jpg', alt: 'Imagem' }) }]) {
    assert.throws(() => validatePortfolio({ projects: [{ ...job(), ...update }] }));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from '../src/content.mjs';
import { casePage } from '../src/templates.mjs';
import { renderPortfolioBlock } from '../public/portfolio.js';

test('Wine Gourmet presents the four PDF compositions with 15 individually accessible originals', () => {
  const wine = projects.find(project => project.slug === 'winegourmet');
  assert.deepEqual(wine.blocks.map(block => block.id), ['experiencia', 'identidade', 'embalagem', 'chicane', 'campanhas', 'dia-do-pai', 'dia-do-pai-pecas']);
  assert.deepEqual(wine.blocks.filter(block => block.type === 'grid').map(block => [block.layout, block.images.length]), [['identity', 5], ['triptych', 3], ['campaign', 3]]);
  const html = casePage(wine, '/PORTIFOLIO/');
  const canvas = html.split('<div class="pf-project-canvas">')[1].split('<section class="pf-project-details')[0];
  assert.equal([...canvas.matchAll(/data-pf-image=/g)].length, 15);
  assert.equal([...canvas.matchAll(/<img /g)].length, 15);
  assert.doesNotMatch(canvas, /O desafio|O conceito|A expressão/);
  for (const image of wine.blocks.flatMap(block => block.type === 'grid' ? block.images : [block])) {
    assert.ok(image.alt.length > 10);
    assert.ok(canvas.includes(`data-pf-image="/PORTIFOLIO${image.src}"`));
    assert.ok(canvas.includes(`width="${image.width}" height="${image.height}"`));
    if (image.responsiveSrc) assert.ok(canvas.includes(`/PORTIFOLIO${image.responsiveSrc} 960w`));
  }
});

test('mosaic names are allowlisted and image attributes remain escaped', () => {
  const html = renderPortfolioBlock({type:'grid', layout:'campaign" onclick="alert(1)', images:[{src:'/images/photo.webp', alt:'"<script>'}]});
  assert.match(html, /pf-grid-uniform/);
  assert.doesNotMatch(html, /onclick=/);
  assert.match(html, /alt="&quot;&lt;script&gt;"/);
});

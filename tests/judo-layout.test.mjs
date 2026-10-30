import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePortfolioProject } from '../server/portfolio-access.js';
import { renderPortfolioBlock } from '../public/portfolio.js';

test('brand showcase survives publication with all five complete originals independently accessible', () => {
  const dimensions = [[1336, 1857], [652, 1857], [652, 913], [652, 1857], [2704, 1857]];
  const images = dimensions.map(([width, height], index) => ({
    src: `/images/showcase-${index + 1}.webp`,
    alt: `Marca e aplicação ${index + 1}`,
    width, height,
    ...(width > 960 ? { responsiveSrc: `/images/showcase-${index + 1}-960.webp` } : {}),
  }));
  const saved = normalizePortfolioProject({
    id: 'brand-showcase', slug: 'brand-showcase', title: 'Marca e aplicações',
    cover: images[0].src, category: 'Identidade visual', publication: 'published',
    blocks: [{ id: 'showcase', type: 'grid', layout: 'brand-showcase', images }],
  });
  assert.equal(saved.blocks[0].layout, 'brand-showcase');
  assert.deepEqual(saved.blocks[0].images, images);
  const html = renderPortfolioBlock(saved.blocks[0], '/PORTIFOLIO/', { eager: true });
  assert.match(html, /pf-grid-brand-showcase/);
  assert.equal([...html.matchAll(/data-pf-image=/g)].length, images.length);
  assert.equal([...html.matchAll(/<img /g)].length, images.length);
  for (const image of images) {
    assert.ok(html.includes(`data-pf-image="/PORTIFOLIO${image.src}"`));
    assert.ok(html.includes(`width="${image.width}" height="${image.height}"`));
    assert.ok(html.includes(`alt="${image.alt}"`));
  }
  assert.equal([...html.matchAll(/loading="eager"/g)].length, 1);
  assert.match(html, /showcase-5-960\.webp 960w, \/PORTIFOLIO\/images\/showcase-5\.webp 2704w/);
  assert.match(html, /sizes="\(max-width: 650px\) 90vw, 100vw"/);
});

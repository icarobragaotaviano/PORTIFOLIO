import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProjectImages } from '../scripts/build.mjs';

test('build checks original and responsive files inside image and mosaic blocks', async () => {
  const present = '/images/work/wine-gourmet-marca.webp';
  const missing = '/images/work/missing-case-image.webp';
  const check = project => validateProjectImages([project]);
  await assert.doesNotReject(check({ cover: present, blocks: [
    { type: 'image', src: present, responsiveSrc: present },
    { type: 'grid', images: [{ src: present, responsiveSrc: present }] },
    { type: 'image', src: 'https://images.example.test/remote.webp' },
  ] }));
  for (const project of [
    { cover: missing },
    { blocks: [{ type: 'image', src: missing }] },
    { blocks: [{ type: 'image', src: present, responsiveSrc: missing }] },
    { blocks: [{ type: 'grid', images: [{ src: missing }] }] },
    { blocks: [{ type: 'grid', images: [{ src: present, responsiveSrc: missing }] }] },
    { blocks: [{ type: 'image', src: '/../package.json' }] },
  ]) await assert.rejects(check(project), /Imagem ausente/);
});

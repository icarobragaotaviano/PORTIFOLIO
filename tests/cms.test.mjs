import test from 'node:test';
import assert from 'node:assert/strict';
import { createCms, CmsError, encodeText, decodeText, checkImage, bytesToBase64 } from '../public/github-cms.js';
const owner = 'icarobragaotaviano';
const data = { projects: [] };
const snapshot = { data, head: 'head-1', tree: 'tree-1', fileSha: 'file-1' };
function mockApi(routes) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname + new URL(url).search;
    calls.push({ path, method: options.method, body: options.body ? JSON.parse(options.body) : null, headers: options.headers });
    assert.equal(new URL(url).origin, 'https://api.github.com');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    const route = routes.shift();
    assert.ok(route, `Unexpected ${options.method} ${path}`);
    if (route.path) assert.equal(path, route.path);
    if (route.throw) throw new Error('Connection lost');
    return { ok: !route.status || route.status < 400, status: route.status || 200, headers: new Headers(route.headers || {}), json: async () => route.body };
  };
  return { fetchImpl, calls, routes };
}
const auth = () => [{ path: '/user', body: { login: owner, name: 'Ícaro Braga' } }, { path: `/repos/${owner}/PORTIFOLIO`, body: { owner: { login: owner }, permissions: { push: true } } }];
test('rejects another account before reading or writing the repository and clears its session', async () => {
  const mock = mockApi([{ path: '/user', body: { login: 'someone-else' } }]); const cms = createCms(mock);
  await assert.rejects(cms.authenticate('credential'), (error) => error.status === 403);
  await assert.rejects(cms.load(), (error) => error.status === 401);
  assert.equal(mock.calls.length, 1);
});
test('requires repository write permission and forgets the rejected token', async () => {
  const mock = mockApi([auth()[0], { body: { owner: { login: owner }, permissions: { push: false } } }]); const cms = createCms(mock);
  await assert.rejects(cms.authenticate('credential'), /não permite editar/);
  await assert.rejects(cms.publish(data, snapshot), (error) => error.status === 401);
  assert.equal(mock.calls.length, 2);
});
test('load reads the content and tree from the same immutable branch head', async () => {
  const mock = mockApi([...auth(), { path: `/repos/${owner}/PORTIFOLIO/git/ref/heads/main`, body: { object: { sha: 'head-1' } } }, { path: `/repos/${owner}/PORTIFOLIO/contents/src/portfolio.json?ref=head-1`, body: { encoding: 'base64', content: encodeText(JSON.stringify(data)), sha: 'file-1' } }, { path: `/repos/${owner}/PORTIFOLIO/git/commits/head-1`, body: { tree: { sha: 'tree-1' } } }]);
  const cms = createCms(mock); await cms.authenticate('credential'); assert.deepEqual(await cms.load(), snapshot); cms.logout(); await assert.rejects(cms.load(), (error) => error.status === 401);
});
test('stale repository head prevents all writes', async () => {
  const mock = mockApi([...auth(), { body: { object: { sha: 'someone-elses-commit' } } }]); const cms = createCms(mock); await cms.authenticate('credential');
  await assert.rejects(cms.publish(data, snapshot), (error) => error instanceof CmsError && error.status === 409);
  assert.ok(mock.calls.every((call) => call.method === 'GET'));
});
test('publishes images and content in one commit while preserving the full base tree', async () => {
  const mock = mockApi([...auth(), { body: { object: { sha: 'head-1' } } }, { body: { sha: 'blob-2' } }, { body: { sha: 'tree-2' } }, { body: { sha: 'head-2' } }, { body: { object: { sha: 'head-2' } } }]);
  const cms = createCms(mock); await cms.authenticate('credential');
  const image = { path: 'public/uploads/job-one.png', content: bytesToBase64(new Uint8Array([137,80,78,71,13,10,26,10])) };
  const result = await cms.publish(data, snapshot, [image]);
  assert.equal(result.sha, 'head-2');
  const treeCall = mock.calls.find((call) => call.path.endsWith('/git/trees'));
  assert.equal(treeCall.body.base_tree, 'tree-1'); assert.equal(treeCall.body.tree.length, 2);
  assert.equal(treeCall.body.tree[0].path, 'src/portfolio.json'); assert.deepEqual(JSON.parse(treeCall.body.tree[0].content), data);
  assert.deepEqual(treeCall.body.tree[1], { path: image.path, mode: '100644', type: 'blob', sha: 'blob-2' });
  assert.deepEqual(mock.calls.at(-2).body.parents, ['head-1']);
  assert.deepEqual(mock.calls.at(-1).body, { sha: 'head-2', force: false });
});
test('concurrent ref update rejection is not reported as publication success', async () => {
  const mock = mockApi([...auth(), { body: { object: { sha: 'head-1' } } }, { body: { sha: 'tree-2' } }, { body: { sha: 'head-2' } }, { status: 422 }]); const cms = createCms(mock); await cms.authenticate('credential');
  await assert.rejects(cms.publish(data, snapshot), (error) => error.status === 422);
});
test('verifies an uncertain final response before declaring publication success', async () => {
  const mock = mockApi([...auth(), { body: { object: { sha: 'head-1' } } }, { body: { sha: 'tree-2' } }, { body: { sha: 'head-2' } }, { throw: true }, { body: { object: { sha: 'head-2' } } }]); const cms = createCms(mock); await cms.authenticate('credential');
  assert.equal((await cms.publish(data, snapshot)).sha, 'head-2');
});
test('validates jobs and upload signatures before making any publication request', async () => {
  const mock = mockApi([...auth()]); const cms = createCms(mock); await cms.authenticate('credential');
  await assert.rejects(cms.publish({ projects: [{ title: '<bad>' }] }, snapshot));
  await assert.rejects(cms.publish(data, snapshot, [{ path: 'public/uploads/fake.png', content: encodeText('<svg onload="alert(1)">') }]), /imagem válida/);
  await assert.rejects(cms.publish(data, snapshot, [{ path: '../evil.js', content: '' }]), /Caminho/);
  assert.equal(mock.calls.length, 2);
});
test('supports UTF-8 text and rejects oversized or spoofed image uploads', () => {
  const text = 'Ícaro: direção de arte & criação'; assert.equal(decodeText(encodeText(text)), text);
  assert.equal(checkImage(new Uint8Array([255,216,255]), 'image/jpeg'), 'jpg');
  assert.throws(() => checkImage(new Uint8Array(3 * 1024 * 1024 + 1), 'image/jpeg'), /3 MB/);
  assert.throws(() => checkImage(new Uint8Array([255,216,255]), 'image/png'), /imagem válida/);
});

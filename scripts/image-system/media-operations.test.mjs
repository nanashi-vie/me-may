import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestFor } from './media-operations.mjs';

test('uses the owner session file for export, preview and receipt without following redirects', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'memay-image-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const session = join(dir, 'session.json');
  const manifest = join(dir, 'mapping.csv');
  await writeFile(session, '{"cookie":"MEMAYSESSION=fixture","csrf":"token"}', { mode: 0o600 });
  await writeFile(manifest, 'fixture');
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), ...init });
    return new Response('result');
  };
  const config = { origin: 'https://example.test', session, fetch };
  await requestFor(config, 'export');
  await requestFor(config, 'preview', manifest);
  await requestFor(config, 'show', '1e0d7e41-910d-4b53-b30b-ac245e8c8e69');
  assert.deepEqual(calls.map(c => c.method), ['GET', 'POST', 'GET']);
  assert.equal(calls[1].headers.get('X-CSRF-TOKEN'), 'token');
  assert.equal(await calls[1].body.get('file').text(), 'fixture');
  assert.ok(calls.every(c => c.redirect === 'error' && c.headers.get('Cookie') === 'MEMAYSESSION=fixture'));
  await chmod(session, 0o644);
  await assert.rejects(requestFor(config, 'export'), /0600/);
  await assert.rejects(requestFor(config, 'apply'), /command/i);
  assert.equal(calls.length, 3);
});

test('reports manifest row errors without echoing response details', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'memay-image-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const session = join(dir, 'session.json');
  const manifest = join(dir, 'mapping.csv');
  await writeFile(session, '{"cookie":"MEMAYSESSION=fixture","csrf":"token"}', { mode: 0o600 });
  await writeFile(manifest, 'fixture');
  const fetch = async () => Response.json({
    error: 'manifest_too_many_rows',
    fieldErrors: { row_102: ['PRIVATE_VALUE'] },
  }, { status: 422 });
  await assert.rejects(requestFor({ origin: 'https://example.test', session, fetch }, 'preview', manifest),
    { message: 'HTTP 422 manifest_too_many_rows (row_102)' });
});

test('apply and rollback require explicit media or book versions and reuse the supplied request key', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'memay-image-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const session = join(dir, 'session.json');
  await writeFile(session, '{"cookie":"MEMAYSESSION=fixture","csrf":"token"}', { mode: 0o600 });
  const receipt = '1e0d7e41-910d-4b53-b30b-ac245e8c8e69';
  const requestKey = '2e0d7e41-910d-4b53-b30b-ac245e8c8e69';
  const media = '3e0d7e41-910d-4b53-b30b-ac245e8c8e69';
  const digest = 'a'.repeat(64);
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), ...init });
    return new Response('result');
  };
  const config = { origin: 'https://example.test', session, fetch };
  const options = ['--receipt', receipt, '--request-key', requestKey];
  await assert.rejects(requestFor(config, 'apply', [...options, '--digest', digest]), /confirm-media/);
  await assert.rejects(requestFor(config, 'rollback', options), /expect-book/);
  await requestFor(config, 'apply', [...options, '--digest', digest, '--confirm-media', media]);
  await requestFor(config, 'rollback', [...options, '--expect-book', '42:7']);
  await requestFor(config, 'show-apply', receipt);
  assert.deepEqual(calls.map(c => c.method), ['POST', 'POST', 'GET']);
  assert.deepEqual(JSON.parse(calls[0].body), { requestKey, digest, confirmedMediaIds: [media] });
  assert.deepEqual(JSON.parse(calls[1].body), { requestKey, expectedBookVersions: { 42: 7 } });
  assert.ok(calls.slice(0, 2).every(c => c.headers.get('X-CSRF-TOKEN') === 'token'
      && c.headers.get('Content-Type') === 'application/json'));
  assert.equal(calls[2].headers.has('X-CSRF-TOKEN'), false);
});

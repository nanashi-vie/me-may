import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createClient } from '../src/client.mjs';
import { runJob } from '../src/index.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'memay-job-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = randomUUID();
  const path = join(root, 'staging', input);
  await mkdir(path, { recursive: true });
  await writeFile(join(path, 'input'), await sharp({
    create: { width: 3, height: 3, channels: 3, background: 'green' },
  }).jpeg().toBuffer());
  return { root, job: { jobId: randomUUID(), token: randomUUID(), mediaId: randomUUID(),
    generationId: randomUUID(), kind: 'PROCESS', inputKey: 'staging/' + input + '/input', recipeVersion: 'v1' } };
}

test('sends an authenticated complete manifest using the subprocess encoder', async t => {
  const { root, job } = await fixture(t);
  const calls = [];
  const client = createClient('http://worker.test:8081', 'fixture', async (url, options) => {
    assert.equal(url.pathname, '/actuator/imagejobs');
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    calls.push(JSON.parse(options.body));
    return new Response(null, { status: 204 });
  });
  assert.equal(await runJob(client, root, job), 'ready');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'COMPLETE');
  assert.equal(calls[0].token, job.token);
  const manifest = JSON.parse(calls[0].manifest);
  assert.equal(manifest.generationId, job.generationId);
  assert.equal(manifest.variants.length, 9);
});

test('lost heartbeat aborts processing and prevents completion', async t => {
  const { root, job } = await fixture(t);
  const client = {
    heartbeat: async () => { throw new Error('lease lost'); },
    complete: async () => assert.fail('must not complete without lease'),
    fail: async () => assert.fail('must not mutate lost lease'),
  };
  const processor = async (_args, signal) => new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  assert.equal(await runJob(client, root, job, { heartbeatMs: 10, processor }), 'lease_lost');
});

test('rejects traversal without starting the encoder', async t => {
  const { root, job } = await fixture(t);
  const failures = [];
  const client = { fail: async (_job, code, retryable) => failures.push({ code, retryable }) };
  assert.equal(await runJob(client, root, { ...job, inputKey: 'staging/../input' },
    { processor: async () => assert.fail('invalid path reached processor') }), 'failed');
  assert.deepEqual(failures, [{ code: 'invalid_job', retryable: false }]);
});

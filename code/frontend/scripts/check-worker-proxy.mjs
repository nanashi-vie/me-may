// Isolated HTTP backend: this probe never writes to the development database.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const backend = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  res.setHeader('Set-Cookie', ['SESSION=probe; HttpOnly; Path=/', 'CSRF=probe; Path=/']);
  res.setHeader('X-Memay-Server-Time', '2026-10-26T00:00:00Z');
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      method: req.method,
      path: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString(),
    }),
  );
});
backend.listen(0, '127.0.0.1');
await once(backend, 'listening');
const origin = 'http://127.0.0.1:8788';
let output = '';
const worker = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--config',
    'wrangler.local.jsonc',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    '8788',
    '--inspector-port',
    '9231',
    '--var',
    `MEMAY_API_ORIGIN:http://127.0.0.1:${backend.address().port}`,
    '--var',
    `MEMAY_SITE_ORIGIN:${origin}`,
  ],
  {
    env: {
      ...process.env,
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
      WRANGLER_SEND_METRICS: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
worker.stdout.on('data', (c) => {
  output = (output + c).slice(-12000);
});
worker.stderr.on('data', (c) => {
  output = (output + c).slice(-12000);
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (worker.exitCode !== null) throw Error(output);
    try {
      await fetch(origin + '/api/probe', { signal: AbortSignal.timeout(500) });
      ready = true;
      break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'workerd readiness timeout: ' + output);
  const response = await fetch(origin + '/api/probe?a=1&a=2', {
    method: 'POST',
    body: '{"probe":true}',
    headers: { 'content-type': 'application/json', cookie: 'SESSION=old', 'x-csrf-token': 'token' },
  });
  const data = await response.json();
  assert.equal(data.method, 'POST');
  assert.equal(data.path, '/api/probe?a=1&a=2');
  assert.equal(data.body, '{"probe":true}');
  assert.equal(data.headers.cookie, 'SESSION=old');
  assert.equal(data.headers['x-csrf-token'], 'token');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-memay-server-time'), '2026-10-26T00:00:00Z');
  assert.deepEqual(response.headers.getSetCookie(), [
    'SESSION=probe; HttpOnly; Path=/',
    'CSRF=probe; Path=/',
  ]);
  const form = new FormData();
  form.append('file', new Blob(['probe-image']), 'probe.txt');
  const upload = await (
    await fetch(origin + '/api/probe-upload', { method: 'POST', body: form })
  ).json();
  assert.match(upload.headers['content-type'], /^multipart\/form-data; boundary=/);
  assert.ok(upload.body.includes('probe-image'));
  assert.ok(upload.body.includes('filename="probe.txt"'));
  const page = await fetch(origin + '/cach-mua');
  assert.equal(page.status, 200);
  assert.ok(
    (await page.text()).includes('href="http://127.0.0.1:8788/cach-mua"'),
    'request context canonical',
  );
  await new Promise((resolve) => backend.close(resolve));
  const down = await fetch(origin + '/api/probe');
  assert.equal(down.status, 503);
  assert.equal(down.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await down.json(), { error: 'backend_unavailable' });
  console.log(
    'PASS workerd POST/query/cookie/CSRF/multipart/separate Set-Cookie/server-time/no-store/context/backend-down',
  );
} finally {
  backend.closeAllConnections();
  backend.close();
  worker.kill('SIGTERM');
  await Promise.race([once(worker, 'exit'), new Promise((resolve) => setTimeout(resolve, 3000))]);
}

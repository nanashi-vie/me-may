import { execFile } from 'node:child_process';
import { lstat, mkdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from './client.mjs';
import { recipes } from './recipes.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function encode(args, signal) {
  return new Promise((done, reject) => {
    const child = execFile(process.execPath, [fileURLToPath(new URL('./encode.mjs', import.meta.url))], {
      signal, timeout: 180_000, killSignal: 'SIGKILL', maxBuffer: 64 * 1024,
    }, (error, output) => {
      if (error) return reject(new Error('encode_failed'));
      try {
        const result = JSON.parse(output);
        if (!result.manifest) return reject(new Error(result.code));
        done(result.manifest);
      } catch {
        reject(new Error('encode_failed'));
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(args));
  });
}

async function paths(root, job) {
  const input = /^staging\/([^/]+)\/input$/.exec(job.inputKey ?? '');
  if (!['PROCESS', 'PREVIEW', 'MIGRATE'].includes(job.kind) || ![job.jobId, job.token, job.mediaId, job.generationId, input?.[1]]
      .every(value => typeof value === 'string' && uuid.test(value))) throw new Error('invalid_job');
  if (!Object.hasOwn(recipes, job.recipeVersion)) throw new Error('unknown_recipe');
  const staging = join(root, 'staging');
  const inputDir = join(staging, input[1]);
  for (const folder of [root, staging, inputDir]) {
    if (!(await lstat(folder)).isDirectory()) throw new Error('invalid_job');
  }
  const attempt = join(staging, job.token);
  await mkdir(attempt);
  const outputDir = join(attempt, 'output');
  await mkdir(outputDir);
  return { inputPath: join(inputDir, 'input'), outputDir, mediaId: job.mediaId,
    generationId: job.generationId, recipeVersion: job.recipeVersion, preview: job.kind === 'PREVIEW' };
}

export async function runJob(client, root, job, { signal, heartbeatMs = 30_000, processor = encode } = {}) {
  const lease = new AbortController();
  const work = signal ? AbortSignal.any([signal, lease.signal]) : lease.signal;
  let beating = false;
  const timer = setInterval(async () => {
    if (beating || work.aborted) return;
    beating = true;
    try {
      await client.heartbeat(job, work);
    } catch {
      lease.abort();
    } finally {
      beating = false;
    }
  }, heartbeatMs);
  try {
    const manifest = await processor(await paths(root, job), work);
    work.throwIfAborted();
    clearInterval(timer);
    await client.complete(job, manifest, work);
    return 'ready';
  } catch (error) {
    if (work.aborted || error.status === 409) return 'lease_lost';
    const terminal = ['invalid_job', 'invalid_image', 'unknown_recipe'].includes(error.message);
    const code = terminal ? error.message : error.status === 422 ? 'invalid_output' : 'encode_failed';
    await client.fail(job, code, !terminal && error.status !== 422, work);
    return 'failed';
  } finally {
    clearInterval(timer);
    lease.abort();
  }
}

async function main() {
  const root = resolve(process.env.MEMAY_IMAGE_ROOT ?? '/srv/memay/images');
  if (await realpath(root) !== root) throw new Error('invalid_image_root');
  const client = createClient(process.env.MEMAY_IMAGE_WORKER_ORIGIN, process.env.MEMAY_IMAGE_WORKER_TOKEN);
  const stop = new AbortController();
  for (const name of ['SIGINT', 'SIGTERM']) process.once(name, () => stop.abort());
  while (!stop.signal.aborted) {
    try {
      const job = await client.claim(stop.signal);
      if (job) {
        await runJob(client, root, job, { signal: stop.signal });
        continue;
      }
    } catch {
      if (!stop.signal.aborted) console.error('image_worker_request_failed');
    }
    await sleep(1000, undefined, { signal: stop.signal }).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('image_worker_start_failed');
    process.exitCode = 1;
  });
}

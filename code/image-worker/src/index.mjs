import { createHash } from 'node:crypto';
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
    }, (error, output, stderr) => {
      const diagnostic = () => process.stderr.write('image_encoder_failed: '
        + String(stderr || error?.code || 'invalid_encoder_response').slice(-4096) + '\n');
      if (error) { diagnostic(); return reject(new Error('encode_failed')); }
      try {
        const result = JSON.parse(output);
        if (!result.manifest) {
          if (result.code === 'encode_failed') diagnostic();
          return reject(new Error(result.code));
        }
        done(result.manifest);
      } catch {
        diagnostic();
        reject(new Error('encode_failed'));
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(args));
  });
}

async function paths(root, job) {
  const banner = job.inputKey?.startsWith('banners/');
  const input = /^(?:banners\/)?staging\/([^/]+)\/input$/.exec(job.inputKey ?? '');
  if (banner && job.kind !== 'PROCESS') throw new Error('invalid_job');
  if (!['PROCESS', 'PREVIEW', 'MIGRATE', 'REBUILD'].includes(job.kind) || ![job.jobId, job.token, job.mediaId, job.generationId, input?.[1]]
      .every(value => typeof value === 'string' && uuid.test(value))) throw new Error('invalid_job');
  if (!Object.hasOwn(recipes, job.recipeVersion)) throw new Error('unknown_recipe');
  const namespace = banner ? join(root, 'banners') : root;
  const staging = join(namespace, 'staging');
  const inputDir = join(staging, input[1]);
  for (const folder of [root, namespace, staging, inputDir]) {
    if (!(await lstat(folder)).isDirectory()) throw new Error('invalid_job');
  }
  const attempt = join(staging, job.token);
  await mkdir(attempt);
  const outputDir = join(attempt, 'output');
  await mkdir(outputDir);
  return { inputPath: join(inputDir, 'input'), outputDir, mediaId: job.mediaId,
    generationId: job.generationId, recipeVersion: job.recipeVersion, preview: job.kind === 'PREVIEW' };
}

export async function runJob(client, root, job, { signal, heartbeatMs = 30_000, processor = encode, workerDigest = process.env.MEMAY_IMAGE_WORKER_DIGEST } = {}) {
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
    if (job.kind === 'REBUILD') {
      manifest.workerDigest = workerDigest ?? '';
      manifest.configurationDigest = createHash('sha256')
        .update(JSON.stringify(recipes[job.recipeVersion])).digest('hex');
    }
    await client.complete(job, manifest, work);
    return 'ready';
  } catch (error) {
    if (work.aborted || (error.status === 409 && error.code !== 'image_recovery_media_changed'
      && error.code !== 'source_unverified')) return 'lease_lost';
    if (job.kind === 'REBUILD' && error.code) {
      await client.fail(job, error.code, false, work);
      return 'failed';
    }
    const terminal = ['invalid_job', 'invalid_image', 'unknown_recipe'].includes(error.message);
    const code = job.kind === 'REBUILD' && error.message === 'unknown_recipe' ? 'recipe_mismatch'
      : terminal ? error.message : error.status === 422 ? 'invalid_output' : 'encode_failed';
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

import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { processImage } from '../../code/image-worker/src/processor.mjs';

const profiles = { '20x2': [20, 2], '50x8': [50, 8] };
const maxInput = 10 * 1024 * 1024;

async function fixture(profile, directory) {
  const [books, count] = profiles[profile] ?? [];
  if (!books) throw new Error('Fixture must be 20x2 or 50x8');
  await mkdir(directory, { recursive: true });
  const requireWorker = createRequire(new URL('../../code/image-worker/package.json', import.meta.url));
  const { default: sharp } = await import(pathToFileURL(requireWorker.resolve('sharp')));
  const images = [];
  for (let index = 0; index < count; index++) {
    const title = 'MEMAY SYNTHETIC ' + (index + 1);
    const stripes = Array.from({ length: 58 }, (_, i) =>
      `<text x="100" y="${200 + i * 40}" fill="#21344a" font-size="23">${title} Sample words 0123456789 — ${i + 1}</text>`).join('');
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2600">
      <rect width="1800" height="2600" fill="#faf3df"/><rect x="80" y="65" width="1640" height="76" fill="#aa5633"/>
      ${stripes}</svg>`);
    const image = `photo-${index + 1}.jpg`;
    await writeFile(join(directory, image), await sharp(svg).jpeg({ quality: 90 }).toBuffer(), { flag: 'wx' });
    images.push(image);
  }
  const path = join(directory, 'manifest.json');
  await writeFile(path, JSON.stringify({ books: Array.from({ length: books }, () => ({ images })) }), { flag: 'wx' });
  process.stdout.write(path + '\n');
}

function percentiles(samples) {
  const sorted = samples.toSorted((a, b) => a - b);
  const at = p => sorted.length ? Math.round(sorted[Math.ceil(sorted.length * p) - 1] * 100) / 100 : null;
  return { count: sorted.length, p50Ms: at(0.5), p95Ms: at(0.95) };
}

function apiOrigin(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Benchmark API must be a local HTTP test origin');
  return new URL('/api/v1/books', url);
}

async function probe(api, measurements) {
  const started = performance.now();
  try {
    const response = await fetch(api, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    await response.arrayBuffer();
    if (!response.ok) throw new Error('status');
    measurements.samples.push(performance.now() - started);
  } catch {
    measurements.errors++;
  }
}

async function run(path, api) {
  const base = await realpath(dirname(resolve(path)));
  const info = await stat(path);
  if (!info.isFile() || info.size > 256 * 1024) throw new Error('Invalid fixture manifest size');
  const { books } = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(books) || !books.length || books.length > 50 || books.some(book =>
    !Array.isArray(book?.images) || !book.images.length || book.images.length > 8))
    throw new Error('Fixture must have 1–50 books with 1–8 images each');
  const images = [];
  for (const name of books.flatMap(book => book.images)) {
    if (typeof name !== 'string' || !name) throw new Error('Invalid fixture image path');
    const image = await realpath(resolve(base, name));
    const source = await stat(image);
    if (!image.startsWith(base + sep) || !source.isFile() || source.size < 1 || source.size > maxInput)
      throw new Error('Fixture image must be inside the fixture directory and at most 10 MiB');
    images.push({ image, bytes: source.size });
  }

  const baseline = { samples: [], errors: 0 }, underLoad = { samples: [], errors: 0 };
  if (api) for (let i = 0; i < 40; i++) {
    await probe(api, baseline);
    await sleep(80);
  }
  const root = await mkdtemp(join(tmpdir(), 'memay-image-benchmark-'));
  const stop = new AbortController();
  const sample = api ? (async () => {
    while (!stop.signal.aborted) {
      await probe(api, underLoad);
      await sleep(80, undefined, { signal: stop.signal }).catch(() => {});
    }
  })() : Promise.resolve();
  const started = performance.now(), cpu = process.cpuUsage();
  const encodes = [], errors = {};
  let outputBytes = 0, allocatedBytes = 0;
  try {
    for (const { image } of images) {
      const outputDir = await mkdtemp(join(root, 'output-'));
      const start = performance.now();
      try {
        const result = await processImage({ inputPath: image, outputDir, mediaId: randomUUID(),
          generationId: randomUUID(), recipeVersion: 'v1' });
        encodes.push(performance.now() - start);
        for (const variant of result.variants) {
          outputBytes += variant.bytes;
          allocatedBytes += (await stat(join(outputDir, variant.key.split('/').at(-1)))).blocks * 512;
        }
      } catch (error) {
        const code = ['invalid_image', 'unknown_recipe', 'ENOSPC'].includes(error.code) ? error.code : 'encode_failed';
        errors[code] = (errors[code] ?? 0) + 1;
      }
    }
  } finally {
    stop.abort();
    await sample;
    await rm(root, { recursive: true, force: true });
  }
  const usage = process.cpuUsage(cpu);
  const http = data => ({ ...percentiles(data.samples), errors: data.errors });
  process.stdout.write(JSON.stringify({
    books: books.length, images: images.length, concurrency: 1, recipe: 'v1',
    encode: percentiles(encodes), wallMs: Math.round(performance.now() - started),
    cpuMs: Math.round((usage.user + usage.system) / 1000), maxRssKiB: process.resourceUsage().maxRSS,
    inputBytes: images.reduce((total, image) => total + image.bytes, 0), outputBytes, allocatedBytes, errors,
    api: api ? { baseline: http(baseline), underLoad: http(underLoad) } : null,
  }, null, 2) + '\n');
  if (Object.keys(errors).length || baseline.errors || underLoad.errors) process.exitCode = 1;
}

try {
  const [command, arg, extra, origin, ...rest] = process.argv.slice(2);
  if (command === 'fixture' && arg && extra && !origin) await fixture(arg, extra);
  else if (command === 'run' && arg && (!extra || (extra === '--api' && origin && !rest.length))) await run(arg, apiOrigin(origin));
  else throw new Error('Usage: benchmark.mjs fixture <20x2|50x8> <directory> or run <manifest> [--api <local-origin>]');
} catch (error) {
  process.stderr.write((error.code ? 'Benchmark failed: ' + error.code : error.message) + '\n');
  process.exitCode = 1;
}

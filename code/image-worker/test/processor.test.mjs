import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { processImage } from '../src/processor.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'memay-sharp-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputDir = join(root, 'output');
  await mkdir(outputDir);
  return { inputPath: join(root, 'input'), outputDir, mediaId: randomUUID(),
    generationId: randomUUID(), recipeVersion: 'v1' };
}

test('rejects fake or unsupported image and unknown recipe', async t => {
  const input = await fixture(t);
  await writeFile(input.inputPath, '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
  await assert.rejects(processImage(input), { code: 'invalid_image' });
  await assert.rejects(processImage({ ...input, recipeVersion: 'unknown' }), { code: 'unknown_recipe' });
});

test('v1 is reproducible, auto-orients, strips metadata and avoids upscaling', async t => {
  const a = await fixture(t);
  const b = await fixture(t);
  const jpg = await sharp({ create: { width: 4, height: 7, channels: 3, background: 'red' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  await writeFile(a.inputPath, jpg);
  await writeFile(b.inputPath, jpg);
  const first = await processImage(a);
  const second = await processImage(b);
  assert.equal(first.variants.length, 9);
  assert.deepEqual(first.variants.map(v => v.sha256), second.variants.map(v => v.sha256));
  for (const v of first.variants) {
    assert.equal(v.width, 7);
    assert.equal(v.height, 4);
    const meta = await sharp(await readFile(join(a.outputDir, v.key.split('/').at(-1)))).metadata();
    assert.equal(meta.exif, undefined);
  }
});

test('transparent input becomes white', async t => {
  const input = await fixture(t);
  await sharp({ create: { width: 2, height: 2, channels: 4, background: '#00000000' } })
    .png().toFile(input.inputPath);
  await processImage(input);
  const pixel = await sharp(join(input.outputDir, '320.jpg')).raw().toBuffer();
  assert.deepEqual([...pixel.subarray(0, 3)], [255, 255, 255]);
});

test('rejects animated WebP and images over 25 megapixels', async t => {
  const animated = await fixture(t);
  const frames = Buffer.from([
    255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255,
    0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255,
  ]);
  await sharp(frames, { raw: { width: 2, height: 4, channels: 4, pageHeight: 2 } })
    .webp({ delay: [100, 100] }).toFile(animated.inputPath);
  await assert.rejects(processImage(animated), { code: 'invalid_image' });
  const oversized = await fixture(t);
  await sharp({ create: { width: 5001, height: 5000, channels: 3, background: 'white' } })
    .png().toFile(oversized.inputPath);
  await assert.rejects(processImage(oversized), { code: 'invalid_image' });
});

test('hero-v1 preserves full-bleed detail at 800/1600/3200 without changing v1', async t => {
 const input=await fixture(t);
 await sharp({create:{width:3200,height:800,channels:3,background:'red'}}).png().toFile(input.inputPath);
 const result=await processImage({...input,recipeVersion:'hero-v1'});
 assert.deepEqual(result.variants.map(v=>[v.name,v.width,v.height]),[['800',800,200],['800',800,200],['1600',1600,400],['1600',1600,400],['3200',3200,800],['3200',3200,800]]);
 const {recipes}=await import('../src/recipes.mjs');
 assert.ok(recipes['hero-v1'].formats.filter(f=>f.extension==='webp').every(f=>f.quality===88));
 assert.equal(recipes.v1.formats.length,9);
});

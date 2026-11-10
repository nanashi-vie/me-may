import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { recipes } from './recipes.mjs';

sharp.concurrency(1);
sharp.cache(false);

const failure = code => Object.assign(new Error(code), { code });

async function readInput(path, limit) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > limit) throw failure('invalid_image');
    const buffer = Buffer.allocUnsafe(stat.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    if (size !== stat.size) throw failure('invalid_image');
    return buffer.subarray(0, size);
  } finally {
    await file.close();
  }
}

function inputFormat(input) {
  if (input.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'jpeg';
  if (input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw failure('invalid_image');
}

export async function processImage({ inputPath, outputDir, mediaId, generationId, recipeVersion, preview = false }) {
  if (!Object.hasOwn(recipes, recipeVersion)) throw failure('unknown_recipe');
  const recipe = recipes[recipeVersion];
  const input = await readInput(inputPath, recipe.maxInputBytes);
  const format = inputFormat(input);
  const source = sharp(input, { limitInputPixels: recipe.maxPixels, animated: true, failOn: 'warning' });
  let metadata;
  try {
    metadata = await source.metadata();
  } catch {
    throw failure('invalid_image');
  }
  if (metadata.format !== format || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height
      || metadata.width * metadata.height > recipe.maxPixels) throw failure('invalid_image');

  const variants = [];
  const formats = preview ? recipe.formats.filter(v => v.size === 480 && v.extension === 'jpg') : recipe.formats;
  for (const { size, extension, mime, quality } of formats) {
    const resized = source.clone().autoOrient()
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).toColourspace('srgb');
    let encoded;
    try {
      encoded = await (extension === 'jpg' ? resized.jpeg({ quality }) : resized.webp({ quality }))
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw failure('invalid_image');
    }
    const name = String(size);
    const file = name + '.' + extension;
    await writeFile(join(outputDir, file), encoded.data, { flag: 'wx' });
    variants.push({ name, key: `derived/${mediaId}/${generationId}/${file}`, mime,
      width: encoded.info.width, height: encoded.info.height, bytes: encoded.data.length,
      sha256: createHash('sha256').update(encoded.data).digest('hex') });
  }
  return { mediaId, generationId, recipeVersion, variants };
}

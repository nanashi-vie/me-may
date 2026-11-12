import { processImage } from './processor.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const manifest = await processImage(JSON.parse(input));
  process.stdout.write(JSON.stringify({ manifest }));
} catch (error) {
  const code = ['invalid_image', 'unknown_recipe'].includes(error.code) ? error.code : 'encode_failed';
  if (code === 'encode_failed') process.stderr.write(String(error.stack || error.message || code).slice(-4096) + '\n');
  process.stdout.write(JSON.stringify({ code }));
}

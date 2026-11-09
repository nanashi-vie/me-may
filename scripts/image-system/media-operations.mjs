import { constants } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const endpoint = '/api/v1/admin/image-migrations';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function siteOrigin(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Use an HTTPS site origin or local HTTP loopback');
  return url.origin;
}

async function ownerSession(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o7777) !== 0o600 || stat.uid !== process.getuid() || stat.size > 4096)
      throw new Error('The owner session must be a regular file owned by you with mode 0600');
    const buffer = Buffer.alloc(4097);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== stat.size) throw new Error('The owner session file changed while reading');
    let session;
    try { session = JSON.parse(buffer.subarray(0, bytesRead)); }
    catch { throw new Error('Invalid owner session file'); }
    if (typeof session?.cookie !== 'string' || !/^MEMAYSESSION=[A-Za-z0-9._%+/=-]+$/.test(session.cookie)
        || typeof session?.csrf !== 'string' || !/^[A-Za-z0-9._%+/=-]{1,2048}$/.test(session.csrf))
      throw new Error('Invalid owner session file');
    return session;
  } finally {
    await file.close();
  }
}

export async function requestFor(config, command, argument) {
  const origin = siteOrigin(config.origin);
  let path, body;
  if (command === 'export' && (!argument || uuid.test(argument))) {
    path = '/template' + (argument ? '?after=' + argument : '');
  } else if (command === 'preview' && argument) {
    const bytes = await readFile(argument);
    if (bytes.length > 65_536) throw new Error('Manifest exceeds 64 KiB');
    body = new FormData();
    body.set('file', new Blob([bytes], { type: 'text/csv' }), 'mapping.csv');
    path = '/preview';
  } else if (command === 'show' && uuid.test(argument ?? '')) {
    path = '/' + argument;
  } else {
    throw new Error('Invalid command. Use export [after], preview <csv>, or show <receipt>');
  }
  const session = await ownerSession(config.session);
  const headers = new Headers({ Cookie: session.cookie });
  if (body) headers.set('X-CSRF-TOKEN', session.csrf);
  const fetcher = config.fetch ?? fetch;
  const response = await fetcher(origin + endpoint + path, {
    method: body ? 'POST' : 'GET', body, headers, redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const code = /^[a-z0-9_]{1,64}$/.test(detail?.error ?? '') ? ' ' + detail.error : '';
    const fields = Object.keys(detail?.fieldErrors ?? {}).filter(key => key === 'file' || /^row_[0-9]{1,3}$/.test(key));
    throw new Error('HTTP ' + response.status + code + (fields.length ? ' (' + fields.join(', ') + ')' : ''));
  }
  return response;
}

async function main() {
  const [command, argument, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Too many command arguments');
  const config = { origin: process.env.MEMAY_SITE_ORIGIN, session: process.env.MEMAY_OWNER_SESSION_FILE };
  if (!config.origin || !config.session) throw new Error('Set MEMAY_SITE_ORIGIN and MEMAY_OWNER_SESSION_FILE');
  const response = await requestFor(config, command, argument);
  if (command === 'export') {
    const next = response.headers.get('X-Next-Media-Id');
    if (next && uuid.test(next)) process.stderr.write('Next page: export ' + next + '\n');
    process.stdout.write(await response.text());
    return;
  }
  const result = await response.json();
  for (const row of result.rows ?? []) {
    for (const field of ['currentPhotoPath', 'previewPath']) {
      if (row[field]?.startsWith(endpoint + '/')) row[field] = siteOrigin(config.origin) + row[field];
    }
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    process.stderr.write((error instanceof TypeError ? 'Image migration request failed' : error.message) + '\n');
    process.exitCode = 1;
  });
}

"""Create a private Render env file; never replace the local application settings."""
import json
import os
from pathlib import Path
import shlex
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[2]

def read_env(path):
    values = {}
    for line in path.read_text().splitlines():
        # A hash inside a value is literal; only unquoted word-boundary # starts a comment.
        quote, escaped, boundary = None, False, True
        for index, char in enumerate(line):
            if escaped:
                escaped, boundary = False, False
                continue
            if char == chr(92) and quote != "'":
                escaped, boundary = True, False
                continue
            if quote:
                if char == quote: quote = None
                boundary = False
            elif char in ("'", '"'):
                quote, boundary = char, False
            elif char == '#' and boundary:
                line = line[:index]
                break
            else: boundary = char.isspace()
        words = shlex.split(line, comments=False)
        if not words: continue
        if words[0] == 'export': words = words[1:]
        if len(words) != 1 or '=' not in words[0]: raise ValueError('Unsupported env assignment')
        key, value = words[0].split('=', 1)
        values[key] = value
    return values

def render_settings(source):
    def parse(raw):
        url = urlsplit(raw)
        if url.scheme not in ('postgres','postgresql') or not (url.hostname or '').endswith('.neon.tech') or not (url.hostname or '').startswith('ep-') or not url.username or not url.password or not url.path.strip('/') or url.fragment:
            raise ValueError('Expected a credentialed Neon PostgreSQL URL')
        return url
    pooled = parse(source.get('NEON_DATABASE_URL', ''))
    if '-pooler.' not in pooled.hostname: raise ValueError('Application URL must use a pooled Neon endpoint')
    direct_host = pooled.hostname.replace('-pooler.', '.', 1)
    direct = parse(source['NEON_DATABASE_URL_UNPOOLED']) if source.get('NEON_DATABASE_URL_UNPOOLED') else pooled._replace(netloc=pooled.netloc.replace(pooled.hostname, direct_host))
    if (direct.hostname, direct.port, direct.path, direct.username, direct.password) != (direct_host, pooled.port, pooled.path, pooled.username, pooled.password):
        raise ValueError('Direct URL must identify the same Neon database and role')
    def jdbc(url):
        port = ':' + str(url.port) if url.port else ''
        return f'jdbc:postgresql://{url.hostname}{port}{url.path}?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&channelBinding=require'
    result = {
        'SPRING_PROFILES_ACTIVE':'render', 'SERVER_ADDRESS':'0.0.0.0',
        'NEON_JDBC_URL':jdbc(pooled), 'NEON_JDBC_URL_UNPOOLED':jdbc(direct),
        'NEON_DB_USER':unquote(pooled.username), 'NEON_DB_PASSWORD':unquote(pooled.password),
        'CLOUDINARY_NAMESPACE':'memay/online-test',
    }
    for key in ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CONTACT_ZALO_HOTLINE_URL','CONTACT_ZALO_GROUP_URL']:
        if source.get(key): result[key] = source[key]
    if any('\n' in v or '\r' in v for v in result.values()): raise ValueError('Multiline values are not supported')
    return result

def prepare():
    target = ROOT / '.local/render.env'
    target.parent.mkdir(exist_ok=True)
    values = render_settings(read_env(ROOT / '.env'))
    # Truncate only the generated destination, and set restrictive permissions before writing.
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.fchmod(fd, 0o600)
    with os.fdopen(fd,'w') as file:
        for key, value in values.items(): file.write(key + '=' + json.dumps(value, ensure_ascii=False) + '\n')
    print('Prepared .local/render.env (0600). Values omitted; root .env unchanged.')
    return values

if __name__ == '__main__':
    try: prepare()
    except (ValueError, OSError): raise SystemExit('Cannot prepare Render environment; check Neon URL/settings (values omitted).')

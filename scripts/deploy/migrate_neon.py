"""Run tracked Flyway migrations against Neon only; local DB_URL is never used."""
import argparse
import os
from pathlib import Path
import re
import subprocess
from prepare_render_env import ROOT, read_env, render_settings

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', type=Path, default=ROOT / '.env')
    parser.add_argument('--info-only', action='store_true')
    parser.add_argument('--log-file', type=Path, default=ROOT / '.local/neon-migration.log')
    args = parser.parse_args()
    settings = render_settings(read_env(args.env_file))
    env = {**os.environ, **settings}
    if not env.get('JAVA_HOME'):
        probe = subprocess.run(['/usr/libexec/java_home','-v','21'],capture_output=True,text=True) if Path('/usr/libexec/java_home').exists() else None
        if probe and probe.returncode == 0: env['JAVA_HOME'] = probe.stdout.strip()
    goals = ['flyway:info'] if args.info_only else ['flyway:migrate','flyway:validate','flyway:info']
    args.log_file.parent.mkdir(parents=True,exist_ok=True)
    fd = os.open(args.log_file,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    os.fchmod(fd,0o600)
    with os.fdopen(fd,'w') as log:
        result = subprocess.run(['./mvnw','-B','-ntp',*goals],cwd=ROOT / 'code/backend',env=env,stdout=log,stderr=subprocess.STDOUT)
    # Full JDBC diagnostics stay in the private log, never echo credentials or endpoints.
    print('Neon Flyway:', 'PASS' if result.returncode == 0 else 'FAILED', '(details in private log)')
    for line in args.log_file.read_text().splitlines():
        if re.search(r'Successfully (applied|validated)|Schema .* up to date',line): print(line)
    return result.returncode

if __name__ == '__main__':
    try: raise SystemExit(main())
    except (OSError,ValueError): raise SystemExit('Migration setup failed; check Neon settings (values omitted).')

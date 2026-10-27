"""Create the explicitly chosen owner once. Never starts the Spring application."""
import argparse
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit
from prepare_render_env import ROOT, read_env, render_settings

def owner_environment(source, target):
    email, password = source.get('OWNER_EMAIL',''), source.get('OWNER_PASSWORD','')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email.strip()) or len(email.strip())>254:
        raise ValueError('Set a valid OWNER_EMAIL in root .env')
    if len(password)<16 or len(password.encode('utf-8'))>72 or not password.strip():
        raise ValueError('OWNER_PASSWORD must have at least 16 characters and at most 72 UTF-8 bytes')
    if target == 'neon':
        settings = render_settings(source)
        url,user,secret = settings['NEON_JDBC_URL_UNPOOLED'],settings['NEON_DB_USER'],settings['NEON_DB_PASSWORD']
    elif target == 'local':
        url = source.get('DB_URL','')
        address = urlsplit(url.removeprefix('jdbc:'))
        if not url.startswith('jdbc:postgresql://') or address.hostname not in ('localhost','127.0.0.1') or address.path!='/me_may_dev' or address.query or address.fragment or address.username or address.password:
            raise ValueError('Local target must be the project me_may_dev database on loopback')
        user,secret = source.get('DB_USER',''),source.get('DB_PASSWORD','')
    else: raise ValueError('Unknown owner target')
    if not user or not secret: raise ValueError('Missing database credentials')
    return {'OWNER_EMAIL':email,'OWNER_PASSWORD':password,'OWNER_JDBC_URL':url,'OWNER_DB_USER':user,'OWNER_DB_PASSWORD':secret}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target',choices=['neon','local'],default='neon')
    args = parser.parse_args()
    settings = owner_environment(read_env(ROOT / '.env'),args.target)
    env = {**os.environ,**settings}
    if not env.get('JAVA_HOME') and Path('/usr/libexec/java_home').exists():
        probe=subprocess.run(['/usr/libexec/java_home','-v','21'],capture_output=True,text=True)
        if probe.returncode==0:env['JAVA_HOME']=probe.stdout.strip()
    logpath=ROOT / '.local/owner-provision.log'
    logpath.parent.mkdir(exist_ok=True)
    fd=os.open(logpath,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    os.fchmod(fd,0o600)
    with os.fdopen(fd,'w') as log:
        build=subprocess.run(['./mvnw','-B','-ntp','-Dmaven.test.skip=true','clean','package'],cwd=ROOT / 'code/backend',env=env,stdout=log,stderr=subprocess.STDOUT)
        if build.returncode:raise RuntimeError('Owner command build failed; see private .local/owner-provision.log')
        java=str(Path(env['JAVA_HOME'])/'bin/java') if env.get('JAVA_HOME') else 'java'
        run=subprocess.run([java,'-Dloader.main=vn.memay.auth.OwnerAccountCommand','-cp',str(ROOT/'code/backend/target/me-may-api-0.1.0-SNAPSHOT.jar'),'org.springframework.boot.loader.launch.PropertiesLauncher'],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    statuses=[line for line in logpath.read_text().splitlines() if line in ('OWNER_ACCOUNT=created','OWNER_ACCOUNT=already_exists')]
    if run.returncode or not statuses:raise RuntimeError('Owner provisioning refused or failed; no credential overwrite performed. See private log.')
    print(statuses[-1] + ' (identity and credentials omitted)')

if __name__=='__main__':
    try: main()
    except (ValueError,RuntimeError,OSError) as error:raise SystemExit(str(error))

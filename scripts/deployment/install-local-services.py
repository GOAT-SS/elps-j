"""Install this checkout's authenticated API and Cloudflare tunnel as login services.

Run with the model-capable Python environment after creating .env.production-api.
Quick Tunnel URLs change if the tunnel restarts: refresh Vercel's production
PRONUNCIATION_API_BASE_URL and redeploy in that case.
"""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
SERVICES = Path.home() / 'Library' / 'LaunchAgents'
DOMAIN = f'gui/{os.getuid()}'


def install():
    if not (ROOT / '.env.production-api').is_file():
        raise SystemExit('Create .env.production-api with PRONUNCIATION_API_KEY first.')
    python = Path(sys.executable).absolute()
    cloudflared = shutil.which('cloudflared')
    if not cloudflared:
        raise SystemExit('cloudflared is required.')
    (ROOT / 'tmp').mkdir(exist_ok=True)
    SERVICES.mkdir(parents=True, exist_ok=True)
    programs = {
        'com.elps-j.pronunciation-api': [str(python), '-m', 'uvicorn', 'backend.main:app', '--env-file', str(ROOT / '.env.production-api'), '--host', '127.0.0.1', '--port', '8000'],
        'com.elps-j.pronunciation-tunnel': [cloudflared, 'tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:8000'],
    }
    for label, arguments in programs.items():
        path = SERVICES / f'{label}.plist'
        if path.exists():
            existing = plistlib.loads(path.read_bytes())
            if existing.get('WorkingDirectory') != str(ROOT):
                raise SystemExit(f'Refusing to replace another checkout service: {label}')
            subprocess.run(['launchctl', 'bootout', f'{DOMAIN}/{label}'], capture_output=True)
        config = {
            'Label': label, 'ProgramArguments': arguments, 'WorkingDirectory': str(ROOT),
            'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 10,
            'EnvironmentVariables': {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin', 'PYTHONUNBUFFERED': '1'},
            'StandardOutPath': str(ROOT / 'tmp' / f'{label}.log'),
            'StandardErrorPath': str(ROOT / 'tmp' / f'{label}.error.log'),
        }
        path.write_bytes(plistlib.dumps(config))
        path.chmod(0o600)
        subprocess.run(['launchctl', 'bootstrap', DOMAIN, str(path)], check=True)
        print(f'Installed {label} (no secret in service configuration)', flush=True)


if __name__ == '__main__':
    install()

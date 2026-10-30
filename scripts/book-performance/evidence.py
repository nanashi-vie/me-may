"""Metadata-only performance evidence. Never copies arbitrary HAR fields."""
import argparse
from collections import defaultdict
import datetime
import json
import math
from pathlib import Path
import re
import statistics
from urllib.parse import urlsplit


def number(value):
    return value if type(value) in (int, float) and math.isfinite(value) and value >= 0 else -1


def route(url):
    path = urlsplit(str(url)).path
    path = re.sub(r'/[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}(?=/|$)', '/:session', path)
    path = re.sub(r'/\d+(?=/|$)', '/:id', path)
    allowed = r'/api/v1/(?:auth/(?:csrf|me)|admin/(?:taxonomy|collections(?:/:id)?|books(?:/:id(?:/(?:preview|audit|media/(?:FRONT|BACK|SPINE|INSIDE_[123])(?:/content)?))?)?|upload-sessions(?:/:session(?:/media(?:/:session)?)?)?))'
    return path if re.fullmatch(allowed, path) else None


def sanitize_har(data: dict) -> dict:
    entries = []
    for entry in data.get('log', {}).get('entries', []):
        request, response = entry.get('request', {}), entry.get('response', {})
        path = route(request.get('url', ''))
        if path is None:
            continue
        clean = {'time': number(entry.get('time')), 'request': {
            'method': request.get('method') if request.get('method') in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE') else 'UNKNOWN',
            'url': path, 'bodySize': number(request.get('bodySize'))},
            'response': {'status': number(response.get('status')), 'bodySize': number(response.get('bodySize')),
                         'content': {'size': number(response.get('content', {}).get('size'))}},
            'timings': {k: number(entry.get('timings', {}).get(k)) for k in
                        ('blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive')}}
        try:
            stamp = datetime.datetime.fromisoformat(entry.get('startedDateTime', '').replace('Z', '+00:00'))
            clean['startedDateTime'] = stamp.isoformat()
        except (ValueError, TypeError):
            pass
        entries.append(clean)
    return {'log': {'version': '1.2', 'creator': {'name': 'metadata-only', 'version': '1'}, 'entries': entries}}


def summarize(records: list) -> dict:
    keys = ('environment', 'revision', 'workload', 'warmState', 'group')
    groups = defaultdict(list)
    for row in records:
        duration = number(row.get('durationMs'))
        if duration >= 0:
            groups[tuple(row.get(k, 'unknown') for k in keys)].append(duration)
    return {'groups': [dict(zip(keys, key), count=len(values), medianMs=statistics.median(values),
                            minMs=min(values), maxMs=max(values)) for key, values in groups.items()]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['sanitize', 'summarize'])
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    data = json.loads(args.input.read_text())
    result = sanitize_har(data) if args.operation == 'sanitize' else summarize(data)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')

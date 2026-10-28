"""Create the smaller authenticated public preview for existing media.

Dry run by default. Example:
  python3 scripts/deploy/backfill_public_media.py --dump .local/backups/dump-neondb-202610281743.dump
  python3 scripts/deploy/backfill_public_media.py --dump .local/backups/dump-neondb-202610281743.dump --apply --expected-count 63 --max-items 1
"""

import argparse
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request


PUBLIC_PREVIEW = "a_auto/c_limit,w_640/q_auto:good/fl_strip_profile,f_jpg"
KEY_PATTERN = re.compile(r"memay/online-test/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z")


def media_keys(dump: Path) -> list[str]:
    result = subprocess.run(
        ["pg_restore", "--data-only", "--table=book_media", "--file=-", str(dump)],
        check=True, capture_output=True, text=True,
    )
    header = re.search(r"^COPY public\.book_media \(([^)]+)\) FROM stdin;$", result.stdout, re.M)
    if not header:
        raise ValueError("book_media COPY missing from dump")
    columns = [part.strip() for part in header.group(1).split(",")]
    state_at, key_at = columns.index("state"), columns.index("storage_public_id")
    rows = result.stdout[header.end():].lstrip("\n").split("\n\\.", 1)[0].splitlines()
    keys = [parts[key_at] for row in rows if (parts := row.split("\t"))[state_at] == "ACTIVE"]
    if not keys or len(set(keys)) != len(keys) or any(not KEY_PATTERN.fullmatch(key) for key in keys):
        raise ValueError("Unexpected media IDs, state or namespace in dump")
    return sorted(keys)


def credentials(path: Path) -> tuple[str, str, str]:
    entries = {}
    for line in path.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            entries[key.strip()] = value.strip().strip('"\'')
    values = tuple(entries.get(key, "") for key in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    if not all(values) or not re.fullmatch(r"[a-zA-Z0-9_-]+", values[0]):
        raise ValueError("Cloudinary credentials missing or invalid")
    return values


def checkpoint(path: Path) -> set[str]:
    if not path.exists():
        return set()
    completed = set(path.read_text().splitlines())
    if any(not KEY_PATTERN.fullmatch(key) for key in completed):
        raise ValueError("Invalid checkpoint")
    return completed


def explicit(cloud: str, key: str, secret: str, public_id: str) -> int:
    url = f"https://api.cloudinary.com/v1_1/{cloud}/image/explicit"
    body = urllib.parse.urlencode({"public_id": public_id, "type": "authenticated", "eager": PUBLIC_PREVIEW}).encode()
    authorization = base64.b64encode(f"{key}:{secret}".encode()).decode()
    request = urllib.request.Request(url, body, {"Authorization": "Basic " + authorization, "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.load(response)
    if result.get("public_id") != public_id or result.get("type") != "authenticated" or not result.get("eager"):
        raise ValueError("Unexpected Cloudinary explicit response")
    return int(result["eager"][0]["bytes"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--env", type=Path, default=Path(".env"))
    parser.add_argument("--checkpoint", type=Path, default=Path(".local/backups/public-preview-backfill.done"))
    parser.add_argument("--expected-count", type=int)
    parser.add_argument("--max-items", type=int)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    keys = media_keys(args.dump)
    if args.expected_count is not None and len(keys) != args.expected_count:
        raise ValueError(f"Expected {args.expected_count} active media IDs, found {len(keys)}")
    done = checkpoint(args.checkpoint)
    if not done.issubset(set(keys)):
        raise ValueError("Checkpoint contains IDs outside dump")
    pending = [key for key in keys if key not in done]
    print(f"Active IDs: {len(keys)}; completed: {len(done)}; pending: {len(pending)}")
    if not args.apply:
        print("Dry run only; use --apply --expected-count to create variants")
        return
    if args.expected_count is None or args.expected_count <= 0:
        raise ValueError("--apply requires --expected-count")
    cloud, key, secret = credentials(args.env)
    args.checkpoint.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(args.checkpoint, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    try:
        with os.fdopen(fd, "a") as output:
            for public_id in pending[:args.max_items]:
                try:
                    size = explicit(cloud, key, secret, public_id)
                except urllib.error.HTTPError as error:
                    raise RuntimeError(f"Cloudinary explicit failed with HTTP {error.code}") from None
                output.write(public_id + "\n")
                output.flush()
                os.fsync(output.fileno())
                print(f"Created {public_id.rsplit('/', 1)[-1]}: {size} bytes")
    finally:
        os.chmod(args.checkpoint, 0o600)


if __name__ == "__main__":
    main()

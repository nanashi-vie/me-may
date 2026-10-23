#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f ../../.env ]]; then
  echo 'Missing root .env. See .env.example and README.' >&2
  exit 1
fi
set -a
source ../../.env
set +a
for key in DB_URL DB_USER DB_PASSWORD BOOTSTRAP_OWNER_EMAIL BOOTSTRAP_OWNER_PASSWORD; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required local setting: $key" >&2
    exit 1
  fi
done
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}"
if [[ $# -eq 0 ]]; then set -- spring-boot:run; fi
exec ./mvnw "$@"

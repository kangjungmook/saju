#!/usr/bin/env bash
# Loads backend/.env (see .env.example) and starts the backend against it.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing backend/.env — copy .env.example to .env and fill in your Supabase credentials." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

exec ./mvnw spring-boot:run

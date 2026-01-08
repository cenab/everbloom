#!/usr/bin/env bash
set -euo pipefail

if [ "${RESET_CONFIRM:-}" != "RESET_REMOTE" ] && [ "${RESET_CONFIRM:-}" != "RESET_LINKED" ]; then
  echo "Refusing to reset linked DB. Set RESET_CONFIRM=RESET_LINKED to proceed." >&2
  exit 1
fi

supabase db reset --linked --yes

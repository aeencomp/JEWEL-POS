#!/usr/bin/env bash
# Update or append keys in .env without replacing the whole file.
set -euo pipefail

ENV_FILE="${1:-.env}"

patch_env() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" || ! -f "$ENV_FILE" ]]; then
    return 0
  fi
  local escaped="${value//\\/\\\\}"
  escaped="${escaped//|/\\|}"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
  echo "==> .env: ${key} updated"
}

patch_env "STORE_REQUIRE_2FA" "${STORE_REQUIRE_2FA:-}"
patch_env "RESEND_API_KEY" "${RESEND_API_KEY:-}"
patch_env "RESEND_FROM_EMAIL" "${RESEND_FROM_EMAIL:-}"

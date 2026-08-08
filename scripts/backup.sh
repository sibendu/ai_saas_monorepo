#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'backup.sh: %s\n' "$1" >&2
  exit 1
}

sanitize_segment() {
  printf '%s' "$1" |
    sed -e 's/%[0-9A-Fa-f][0-9A-Fa-f]/-/g' \
      -e 's/[^A-Za-z0-9._-]/-/g' \
      -e 's/-\{1,\}/-/g' \
      -e 's/^-//' \
      -e 's/-$//'
}

database_name_from_url() {
  url_without_query="${1%%\?*}"
  url_without_fragment="${url_without_query%%#*}"

  case "$url_without_fragment" in
    *dbname=*)
      db_part="${url_without_fragment#*dbname=}"
      db_part="${db_part%% *}"
      db_part="${db_part#\'}"
      db_part="${db_part%\'}"
      db_part="${db_part#\"}"
      db_part="${db_part%\"}"
      ;;
    *://*)
      path_part="${url_without_fragment#*://}"
      path_part="${path_part#*/}"
      db_part="${path_part%%/*}"
      ;;
    *)
      db_part=""
      ;;
  esac

  safe_name="$(sanitize_segment "$db_part")"
  if [ -n "$safe_name" ]; then
    printf '%s' "$safe_name"
  else
    printf 'database'
  fi
}

if [ "$#" -gt 1 ]; then
  fail "expected zero or one argument: optional backup directory"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  fail "DATABASE_URL is required"
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  fail "pg_dump is required but was not found on PATH"
fi

backup_dir="${1:-${BACKUP_DIR:-backups}}"
database_name="$(database_name_from_url "$DATABASE_URL")"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="${backup_dir%/}/${database_name}-${timestamp}.dump"
temporary_file="${backup_file}.tmp"

mkdir -p "$backup_dir"

cleanup() {
  rm -f "$temporary_file"
}

trap cleanup EXIT

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$temporary_file" \
  "$DATABASE_URL"

mv "$temporary_file" "$backup_file"
trap - EXIT

backup_size="$(wc -c <"$backup_file" | tr -d '[:space:]')"

printf 'Backup created: %s\n' "$backup_file"
printf 'Backup size: %s bytes\n' "$backup_size"

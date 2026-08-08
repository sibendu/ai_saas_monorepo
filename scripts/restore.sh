#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'restore.sh: %s\n' "$1" >&2
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

host_from_url() {
  url_without_query="${1%%\?*}"
  url_without_fragment="${url_without_query%%#*}"

  case "$url_without_fragment" in
    *host=*)
      host_part="${url_without_fragment#*host=}"
      host_part="${host_part%% *}"
      host_part="${host_part#\'}"
      host_part="${host_part%\'}"
      host_part="${host_part#\"}"
      host_part="${host_part%\"}"
      ;;
    *://*)
      authority_and_path="${url_without_fragment#*://}"
      authority="${authority_and_path%%/*}"
      host_part="${authority##*@}"
      host_part="${host_part%%:*}"
      ;;
    *)
      host_part=""
      ;;
  esac

  safe_host="$(sanitize_segment "$host_part")"
  if [ -n "$safe_host" ]; then
    printf '%s' "$safe_host"
  else
    printf 'default'
  fi
}

if [ "$#" -ne 1 ]; then
  fail "expected exactly one argument: backup file path"
fi

backup_file="$1"

if [ ! -f "$backup_file" ]; then
  fail "backup file does not exist or is not a file: $backup_file"
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  fail "pg_restore is required but was not found on PATH"
fi

if [ -n "${RESTORE_DATABASE_URL:-}" ]; then
  target_url="$RESTORE_DATABASE_URL"
elif [ "${CONFIRM_RESTORE:-}" = "yes" ] && [ -n "${DATABASE_URL:-}" ]; then
  target_url="$DATABASE_URL"
else
  fail "RESTORE_DATABASE_URL is required; DATABASE_URL fallback requires CONFIRM_RESTORE=yes"
fi

target_host="$(host_from_url "$target_url")"
target_database="$(database_name_from_url "$target_url")"

printf 'Restore target: host=%s database=%s\n' "$target_host" "$target_database"
printf 'Backup file: %s\n' "$backup_file"
printf 'WARNING: restore uses --clean and may drop existing database objects.\n' >&2

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  if [ -t 0 ] && [ -t 1 ]; then
    printf 'Type "restore" to continue: ' >&2
    read -r confirmation
    if [ "$confirmation" != "restore" ]; then
      fail "restore was not confirmed"
    fi
  else
    fail "set CONFIRM_RESTORE=yes or run interactively and confirm the destructive restore"
  fi
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --dbname "$target_url" \
  "$backup_file"

printf 'Restore completed from: %s\n' "$backup_file"

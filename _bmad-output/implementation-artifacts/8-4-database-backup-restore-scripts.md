---
baseline_commit: 352a31537ed26ca1894db0d32fb03ff98cb9ae20
---

# Story 8.4: Database Backup & Restore Scripts

Status: review

## Story

As an operator responsible for the SaaS foundation database,
I want repeatable PostgreSQL backup and restore scripts,
so that I can create recoverable database snapshots and safely restore them during local, staging, or production operations.

## Acceptance Criteria

1. Given `DATABASE_URL` points to a reachable PostgreSQL database and PostgreSQL client tools are installed, when the operator runs `./scripts/backup.sh`, then the script creates a timestamped backup under `backups/` and exits non-zero on any failure.
2. Given the backup script completes, when the operator inspects the artifact, then the backup is a PostgreSQL custom-format archive suitable for `pg_restore`, has a deterministic filename containing database name and UTC timestamp, and is not committed to source control.
3. Given a valid backup file exists, when the operator runs `./scripts/restore.sh <backup-file>`, then the script validates inputs, warns before destructive restore behavior, restores into the target database using `pg_restore`, and exits non-zero on restore failure.
4. Given restore safety matters, when the operator runs `restore.sh` without explicit confirmation or an explicit target database URL, then the script refuses to proceed instead of silently overwriting data.
5. Given local development uses npm workspace scripts, when the operator runs `npm run db:backup` or `npm run db:restore -- <backup-file>`, then those commands invoke the shell scripts from the repository root.
6. Given backup files may contain sensitive user data and password/token hashes, when implementation is complete, then `backups/` is ignored by git and the documentation states that backup files must be encrypted and protected outside local development.
7. Given the restore process is tested, when a backup is restored into a disposable database, then row counts or representative records from `customer`, `role`, `module`, `sub_module`, `role_module`, `user_role`, `task`, and `audit_log` are accurate for tables that exist in the source backup.
8. Given the scripts are reviewed, when credentials are handled, then no database password, URL, `.pgpass` entry, backup archive, or production credential is hardcoded into scripts, docs, npm scripts, or committed files.

## Tasks / Subtasks

- [x] Create repository backup and restore script structure. (AC: 1, 3, 5)
  - [x] Create root `scripts/` directory.
  - [x] Add `scripts/backup.sh`.
  - [x] Add `scripts/restore.sh`.
  - [x] Make both scripts POSIX-shell compatible enough for Linux, macOS, Git Bash, and WSL.
  - [x] Use `set -euo pipefail` or the closest compatible pattern; do not allow partial success.
- [x] Implement `scripts/backup.sh`. (AC: 1, 2, 6, 8)
  - [x] Require `DATABASE_URL`; allow an optional first argument or `BACKUP_DIR` to override the default `backups/` directory.
  - [x] Verify `pg_dump` is available before connecting.
  - [x] Create `backups/` when missing.
  - [x] Run `pg_dump --format=custom --no-owner --no-privileges --file <backup-file> "$DATABASE_URL"`.
  - [x] Use UTC timestamp format such as `YYYYMMDDTHHMMSSZ`.
  - [x] Derive a safe database-name segment for the filename without printing credentials.
  - [x] Print the final backup path and size without echoing `DATABASE_URL`.
- [x] Implement `scripts/restore.sh`. (AC: 3, 4, 7, 8)
  - [x] Require exactly one backup file argument unless documented flags are added.
  - [x] Require restore target via `RESTORE_DATABASE_URL`; fall back to `DATABASE_URL` only when `CONFIRM_RESTORE=yes` is set.
  - [x] Verify `pg_restore` is available before connecting.
  - [x] Verify the backup path exists and is a file.
  - [x] Show the target host/database with credentials redacted before restoring.
  - [x] Refuse to restore unless `CONFIRM_RESTORE=yes` is present or the user confirms interactively in a TTY.
  - [x] Use `pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$TARGET_URL" <backup-file>`.
  - [x] Document that destructive restore should be performed against disposable/local/staging databases first.
- [x] Add source-control and npm integration. (AC: 2, 5, 6)
  - [x] Update root `.gitignore` to ignore `backups/` and common dump/archive extensions under that directory.
  - [x] Add root `package.json` scripts:
    - [x] `"db:backup": "bash scripts/backup.sh"`
    - [x] `"db:restore": "bash scripts/restore.sh"`
  - [x] Keep existing Prisma scripts intact.
- [x] Add focused operator documentation. (AC: 1, 3, 4, 6, 8)
  - [x] Update `DEPLOYMENT.md` with a database backup and restore section, or create `scripts/README.md` and link it from `DEPLOYMENT.md`.
  - [x] Document required tools: `pg_dump`, `pg_restore`, `bash`, and access to the target PostgreSQL server.
  - [x] Document local usage:
    - [x] `DATABASE_URL=... ./scripts/backup.sh`
    - [x] `RESTORE_DATABASE_URL=... CONFIRM_RESTORE=yes ./scripts/restore.sh backups/<file>.dump`
    - [x] `npm run db:backup`
    - [x] `npm run db:restore -- backups/<file>.dump`
  - [x] Document production guidance: use managed encrypted backups for primary production backup strategy where available; these scripts are manual logical backup/restore helpers.
  - [x] State that backup archives contain sensitive data and must be encrypted, access-controlled, and excluded from git.
- [x] Validate against a disposable PostgreSQL database. (AC: 1, 3, 7)
  - [x] Run the backup script against a local/dev database with migrated schema.
  - [x] Create or select a disposable restore database.
  - [x] Restore the backup into the disposable database.
  - [x] Run representative checks with `psql`, Prisma Studio, or a small SQL query to compare tables that exist in the source database.
  - [x] Record exact commands and results in the Dev Agent Record.
- [x] Run repository checks after edits. (AC: 5, 8)
  - [x] Run `npm run type-check` if package scripts or source files changed.
  - [x] Run shell syntax checks if available, for example `bash -n scripts/backup.sh scripts/restore.sh`.
  - [x] Do not mark restore accuracy complete unless a real disposable restore was performed.

## Dev Notes

### Epic and Business Context

- Epic 8 provides deployment, database, and testing scripts so the foundation is deployable through Docker Compose and Kubernetes. Story 8.4 covers PostgreSQL backup and restore scripts only.
- PRD FR.08.04 requires `scripts/backup.sh` and `scripts/restore.sh` for local development and production-oriented operation.
- These scripts support operator reliability, but they do not replace managed database backup, point-in-time recovery, or encrypted snapshot policies in production.

### Current Repository State

- No root `scripts/` directory exists.
- No root `docker-compose.yml` exists.
- No root `k8s/` directory exists.
- Root `package.json` already has database scripts for Prisma validation, generation, migration, deploy, status, studio, and seed. Add backup/restore scripts without changing those contracts.
- `DEPLOYMENT.md` already has a security checklist item for backups and a Database Encryption At Rest section, but it has no runnable backup/restore instructions yet.
- Root `.gitignore` does not currently ignore `backups/`; add it before producing any local backup artifact.
- `apps/web/prisma/schema.prisma` is the current database schema source. Models map to snake_case database tables: `customer`, `task`, `role`, `module`, `sub_module`, `role_module`, `user_role`, and `audit_log`.
- `apps/web/.env.local.example` defines `DATABASE_URL`; do not read or print real `.env` values.
- `apps/bff/.env.example` comments a BFF `DATABASE_URL`; BFF runtime also uses Prisma, but this story should use the operator-supplied target database URL directly.

### Files to Create or Update

- Create `scripts/backup.sh`.
- Create `scripts/restore.sh`.
- Update root `.gitignore`.
- Update root `package.json`.
- Update `DEPLOYMENT.md` or create `scripts/README.md` and link it from `DEPLOYMENT.md`.
- Do not modify Prisma schema, migrations, app runtime code, Dockerfiles, or Kubernetes manifests for this story unless validation exposes a direct backup/restore blocker.

### Script Contract

- `backup.sh` default command:
  - Input: `DATABASE_URL` environment variable.
  - Optional input: `BACKUP_DIR`, defaulting to `backups`.
  - Output: `backups/<database-name>-<utc-timestamp>.dump`.
  - Tool: `pg_dump` custom archive format.
- `restore.sh` default command:
  - Input: `RESTORE_DATABASE_URL` and one backup-file argument.
  - Optional fallback: allow `DATABASE_URL` only with `CONFIRM_RESTORE=yes`.
  - Tool: `pg_restore` against a target database URL.
  - Safety: refuse ambiguous or unconfirmed destructive restores.
- Redaction rule: never echo the raw connection URL. If logging connection info, parse and print only sanitized host/database values.

### Architecture Guardrails

- Keep scripts database-focused. Do not start the web app, BFF, Docker Compose, or Kubernetes as part of backup/restore.
- Keep database credentials external. Use environment variables, `.pgpass`/`PGPASSFILE`, secret managers, or CI/CD secret injection; never hardcode secrets.
- Backup archives can contain personal data, password hashes, reset token hashes, audit records, and role mappings. Treat them as sensitive production data.
- Do not commit generated backups. The implementation should make accidental commits unlikely through `.gitignore` and documentation.
- Do not dump or restore individual tables by default. The operator needs a full logical database backup for the application schema.
- Do not use `prisma migrate reset` as restore behavior. Restore must use PostgreSQL-native tools so it can recover real database contents, not just schema plus seed data.
- `pg_dump` does not dump cluster-global roles and tablespaces. This app should not depend on global role restoration for the default script, but documentation should mention `pg_dumpall --globals-only` for operators who need cluster-level role/tablespace backups.

### Restore Safety Requirements

- The restore path is destructive when `--clean` is used. Require explicit confirmation and clearly document that production restores should be rehearsed on disposable databases.
- Prefer restoring into a new empty database for validation. If restoring over an existing database, require the operator to confirm that existing objects may be dropped.
- Include `--if-exists` with `--clean` to avoid noisy failures when objects do not exist in the target.
- Include `--no-owner --no-privileges` for portability across local, containerized, and managed PostgreSQL users unless implementation testing proves ownership/ACL restoration is required.
- If the target database must be created first, document a separate operator step using `createdb` or provider tooling. Do not hide database creation inside `restore.sh` unless the script can do it safely and portably.

### Windows Workspace Notes

- The repository is currently on Windows, but the epic names `.sh` scripts. Target execution environments should be Linux containers, WSL, Git Bash, macOS, and CI runners with bash.
- Do not convert the deliverable to PowerShell-only scripts. A future story may add `.ps1` wrappers, but this story should keep the requested `backup.sh` and `restore.sh`.
- If npm scripts use `bash scripts/...`, document that Windows users need Git Bash or WSL on PATH.

### Previous Story Intelligence

- Story 8.2 says Docker image work is ready-for-dev, but actual Dockerfiles may still be absent until implemented. This story must not depend on Docker images.
- Story 8.3 says Kubernetes manifests are ready-for-dev, but no `k8s/` directory currently exists. This story should not require Kubernetes resources to exist.
- Sprint status shows `8-1-docker-compose-setup-local-dev` and `8-5-seed-data-script` are in progress. Do not assume Compose or seed work is complete.
- Recent commits focused on admin audit trail and admin UI/API fixes:
  - `352a315 fix: handle non-json admin api responses`
  - `29b9d0b feat: add admin audit trail logging`
  - `19782dc merge: complete admin role module mapping`
  - `c0d11e8 feat: complete admin role module mapping`
  - `aeeaf45 feat: add admin module management tab`
- Relevant pattern from recent work: preserve existing scripts and add focused tests or validation notes instead of broad refactors.

### Latest Technical Information

- PostgreSQL `pg_dump` custom-format archives are portable and intended to be restored with `pg_restore`; use this over plain SQL when script-controlled restore behavior is needed. Source: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` restores archives created by `pg_dump` in non-plain formats and can reconstruct a database to the saved state. Source: https://www.postgresql.org/docs/current/app-pgrestore.html
- `PGPASSWORD` is supported but PostgreSQL warns it is not recommended because some systems expose process environments; prefer password files or secret injection when practical. Source: https://www.postgresql.org/docs/current/libpq-envars.html
- `.pgpass`/`PGPASSFILE` is the PostgreSQL-supported password-file path for noninteractive client authentication. Source: https://www.postgresql.org/docs/current/libpq-pgpass.html
- `pg_dumpall --globals-only` is needed for cluster-global objects such as roles and tablespaces; `pg_dump` is database-scoped. Source: https://www.postgresql.org/docs/current/app-pg-dumpall.html

## Project Structure Notes

- New operational scripts belong under root `scripts/`, not inside `apps/web/prisma/`.
- Runtime application code should continue to use Prisma. Backup/restore should use PostgreSQL-native CLI tools because Prisma does not provide a full logical backup/restore utility.
- Keep documentation near deployment operations. `DEPLOYMENT.md` is the current operator guide; a focused `scripts/README.md` is acceptable if linked from `DEPLOYMENT.md`.

## References

- Epic/story requirements: `_bmad-output/planning-artifacts/epics/epics-saas_monorepo-2026-07-09/EPICS-AND-STORIES.md#Story-8.4-Database-Backup--Restore-Scripts`
- PRD requirement: `_bmad-output/planning-artifacts/prds/prd-saas_monorepo-2026-07-09/prd.md#FRx08-Deployment-Database--Testing-Scripts`
- Architecture deployment target: `_bmad-output/planning-artifacts/architecture/architecture-saas_monorepo-2026-07-09/ARCHITECTURE-SPINE.md#AD-10-Deployment-Targets-LOCKED`
- Security and encryption guidance: `DEPLOYMENT.md#Database-Encryption-At-Rest`
- Project environment conventions: `docs/project-context.md#Environment-Variables`
- Current schema: `apps/web/prisma/schema.prisma`
- Root database scripts: `package.json`
- PostgreSQL `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL password files: https://www.postgresql.org/docs/current/libpq-pgpass.html

## Open Questions / Assumptions

- Assumption: `pg_dump --format=custom` plus `pg_restore` is the correct default because it gives a portable archive and controlled restore behavior.
- Assumption: The default backup excludes ownership and privilege restoration for portability across local and managed database users.
- Assumption: Production operators should rely on managed encrypted backups/PITR where available; these scripts are manual logical backup helpers and a recovery drill tool.
- Open question for implementation: Should `restore.sh` support an explicit `--create-db` mode, or should database creation remain a documented operator step to avoid accidental destructive behavior?

## Dev Agent Record

### Agent Model Used

gpt-5.5

### Debug Log References

- RED: `bash -n scripts/backup.sh scripts/restore.sh` failed before script creation with `scripts/backup.sh: No such file or directory`.
- Syntax: `bash -n scripts/backup.sh scripts/restore.sh` passed after script creation.
- Negative input checks: `bash scripts/backup.sh` failed with `DATABASE_URL is required`; `bash scripts/restore.sh` failed with `expected exactly one argument: backup file path`.
- Tool availability: `pg_dump`, `pg_restore`, and `psql` were available; PostgreSQL client version in WSL was 16.14 and Windows PostgreSQL client/server version used for disposable validation was 18.1.
- Disposable validation setup: started temporary PostgreSQL 18 cluster on port `55432`; created `bmad84_20260808213935_source` and `bmad84_20260808213935_restore`.
- Migrated source database with `npm.cmd run db:deploy`; all six Prisma migrations applied successfully.
- Seeded representative rows into `customer`, `task`, `role`, `module`, `sub_module`, `role_module`, `user_role`, and `audit_log`.
- Backup command: `DATABASE_URL=postgresql://postgres@172.29.208.1:55432/bmad84_20260808213935_source BACKUP_DIR=backups/validation-bmad84_20260808213935 bash scripts/backup.sh`; created `backups/validation-bmad84_20260808213935/bmad84_20260808213935_source-20260808T161542Z.dump` at 26917 bytes.
- Restore command: `RESTORE_DATABASE_URL=postgresql://postgres@172.29.208.1:55432/bmad84_20260808213935_restore CONFIRM_RESTORE=yes bash scripts/restore.sh backups/validation-bmad84_20260808213935/bmad84_20260808213935_source-20260808T161542Z.dump`; restore completed.
- Restore verification row counts matched source: `audit_log=1`, `customer=1`, `module=1`, `role=1`, `role_module=1`, `sub_module=1`, `task=1`, `user_role=1`.
- Temporary PostgreSQL cluster stopped successfully with `pg_ctl -D ... -m fast -w stop`; cleanup deletion was blocked by local command policy, but the generated backup path is ignored by git.
- Repository checks: `npm.cmd run type-check` passed; `npm.cmd run test` passed with 33 test files and 201 tests; `npm.cmd run db:backup` and `npm.cmd run db:restore` invoked the new scripts and failed fast for expected missing input.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added fail-fast PostgreSQL custom-format backup script with safe database-name filename segment, UTC timestamping, backup directory override, and credential-safe output.
- Added destructive restore script with required target validation, redacted host/database summary, explicit confirmation gate, and `pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error`.
- Added root npm integration for `db:backup` and `db:restore` while preserving existing Prisma scripts.
- Added git ignore coverage for `backups/` and common backup/archive extensions under that directory.
- Documented operator backup/restore usage, required tools, restore rehearsal guidance, sensitive archive handling, managed backup guidance, and cluster-global backup caveat in `DEPLOYMENT.md`.
- Validated backup and restore against a disposable migrated PostgreSQL database and confirmed row count parity for the required tables.

### File List

- `.gitignore`
- `DEPLOYMENT.md`
- `package.json`
- `scripts/backup.sh`
- `scripts/restore.sh`
- `_bmad-output/implementation-artifacts/8-4-database-backup-restore-scripts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-08: Implemented database backup/restore scripts, npm integration, backup ignore rules, operator documentation, and disposable PostgreSQL restore validation.

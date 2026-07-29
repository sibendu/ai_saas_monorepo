# AGENTS.md

Project-level guidance for AI coding agents working in this repository.

## Scan Boundaries

Do not recursively scan, index, summarize, grep, or load files from dependency, generated, cache, virtual environment, or agent-runtime folders unless the user explicitly asks for one of those folders by name.

Default excluded paths:

- `node_modules/`
- `apps/*/node_modules/`
- `.venv/`
- `.git/`
- `_bmad/`
- `_bmad-ui/`
- `_bmad-output/`
- `.agents/`
- `.claude/`
- `.opencode/`
- `graphify-out/`
- `dist/`
- `build/`
- `coverage/`
- `reports/`

When searching the codebase, prefer scoped commands such as:

```bash
rg "pattern" apps packages docs --glob '!**/node_modules/**'
```

It is acceptable to read a specific known file inside an excluded folder when the task directly concerns that file, for example `_bmad-output/planning-artifacts/.../prd.md` or `_bmad-ui/scripts/server/...`. Do not broaden that into a recursive scan of the excluded folder.

For project understanding, start with:

- `README.md`
- `docs/project-context.md`
- `apps/`
- `packages/`


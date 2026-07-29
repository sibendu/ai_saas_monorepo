---
description: Initialize the local feature loop in a new or existing repository. Use when the user asks to install, configure, detect, bootstrap, or initialize the feature loop for a project.
---

# Initialize Feature Loop

Run the bundled `install-loop.cmd` from the target repository only after confirming the ZIP was extracted there. First run it without `--write` and read `.ai-loop/discovery.json`.

Do not overwrite or edit existing `AGENTS.md`, `CLAUDE.md`, `.env`, package manifests, or project configuration. If detection contains ambiguities, present them and ask for direction. If it is unambiguous, run the installer with `--write`, then validate the created `.ai-loop/project.json` with the runtime loop command.

Treat required environment variable names as sensitive metadata: report presence only and never print values. Confirm the configured target branch, database policy, and verification commands before declaring initialization complete.

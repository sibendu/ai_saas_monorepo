---
name: run-feature-loop
description: Plan, schedule, and run one or more feature requests through the local feature loop. Use when the user provides features as text, Markdown files, or a Markdown directory and asks to run them autonomously.
---

# Run Feature Loop Batch

Verify `.ai-loop/project.json` first. Accept inline feature text, one Markdown file, or a Markdown directory. Generate a batch plan only; show its waves, dependencies, database classifications, predicted paths, target branch, and merge policy to the user.

Do not start worktrees or feature execution until the user explicitly approves the displayed batch id. Treat missing database access and predicted-path metadata as unsafe: schedule those features serially. After approval, use the bundled batch runner. It may merge only after all feature and integration checks/reviews pass; preserve worktrees and branches when review is required.

---
name: pre-push-checks
description: Use before pushing, force-pushing, marking ready for review, or claiming checks pass on a branch. Selects the smallest tests and checks that cover the outgoing changes.
---

# Pre-push checks

**This skill is guidance, not a complete checklist.** Select the narrowest checks that cover the changed surface. Never default to the full suite or repeat a passing check.

## Decision flow

1. **Identify the changed surface.** Run `git diff --name-only <base>...HEAD` to list changed files. Classify by area: source code, tests, documentation, configuration, scripts.

2. **Select matching checks:**

   | Changed area | Required checks |
   |---|---|
   | Source code (`src/`) | `{{PM_RUN}} typecheck`, `{{PM_RUN}} test` (matching packages), `{{PM_RUN}} lint` |
   | Tests only | `{{PM_RUN}} test` (matching packages) |
   | Documentation (`docs/`, `*.md`) | `{{PM_RUN}} doc-sync` or `{{PM_RUN}} test:docs` |
   | Configuration (`*.json`, `*.yml`) | `{{PM_RUN}} typecheck`, relevant test |
   | Scripts (`scripts/`) | `{{PM_RUN}} typecheck`, script-specific test |
   | Agent Notes (`.agents/`) | `{{PM_RUN}} verify-agent-note-format`, `{{PM_RUN}} verify-agent-note-classification` |

3. **Run checks in order of increasing cost.** Typecheck first (fastest), then lint, then tests, then doc-sync.

4. **Report only commands run.** State which checks were executed and their outcomes. Do not claim checks pass for commands not run.

## Special cases

- **After `git rebase` or force-push:** re-run all checks that cover the rebased range.
- **Before marking ready for review:** run the full `{{PM_RUN}} doc-sync` gate.
- **Stacked PRs:** validate the complete stack, not just the top branch.

## What NOT to do

- Do not run the full suite for a documentation-only change.
- Do not re-run a check that already passed in CI for the same commit.
- Do not skip typecheck even for "trivial" source changes.

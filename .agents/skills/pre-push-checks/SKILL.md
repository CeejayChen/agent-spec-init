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
   | Source code (`src/`) | `npm run typecheck`, `npm run test` (matching packages), `npm run lint` |
   | Tests only | `npm run test` (matching packages) |
   | Documentation (`docs/`, `*.md`) | `npm run doc-sync` or `npm run test:docs` |
   | Configuration (`*.json`, `*.yml`) | `npm run typecheck`, relevant test |
   | Scripts (`scripts/`) | `npm run typecheck`, script-specific test |
   | Agent Notes (`.agents/`) | `npm run verify-agent-note-format`, `npm run verify-agent-note-classification` |

3. **Run checks in order of increasing cost.** Typecheck first (fastest), then lint, then tests, then doc-sync.

4. **Report only commands run.** State which checks were executed and their outcomes. Do not claim checks pass for commands not run.

## Special cases

- **After `git rebase` or force-push:** re-run all checks that cover the rebased range.
- **Before marking ready for review:** run the full `npm run doc-sync` gate.
- **Stacked PRs:** validate the complete stack, not just the top branch.

## What NOT to do

- Do not run the full suite for a documentation-only change.
- Do not re-run a check that already passed in CI for the same commit.
- Do not skip typecheck even for "trivial" source changes.

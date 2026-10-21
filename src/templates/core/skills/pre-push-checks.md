---
name: pre-push-checks
description: Use before pushing, force-pushing, marking ready for review, or claiming checks pass on a branch. Selects the smallest checks that cover the outgoing changes.
---

# Pre-push checks

**This skill is guidance, not a complete checklist.** Select the narrowest checks that cover the changed surface. Never default to the full suite, and never repeat a check that already passed for the same commit.

## Decision flow

1. **Identify the changed surface.** Run `git diff --name-only <base>...HEAD` and classify each file: source code, tests, documentation, configuration, or Agent Notes.
2. **Select the matching checks:**

{{CHECK_TABLE}}

3. **Run checks in increasing cost order.** The fastest check that can fail goes first.
4. **Report only commands that ran.** State each command and its outcome; never claim a check passed that was not executed.

## Special cases

- **After a rebase or force-push:** re-run every check that covers the rebased range.
- **Before marking ready for review:** {{REVIEW_STEP}}
- **Stacked change sets:** validate the complete stack, not only the top branch.

## What not to do

- Do not run the full suite for a documentation-only change.
- Do not re-run a check that passed in CI for the same commit.
- Do not skip the type or compile check for a "trivial" source change.

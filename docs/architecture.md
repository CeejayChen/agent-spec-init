# Architecture

agent-spec-init is a scaffolder: it reads a target repository, plans a set of files, and writes an agent specification system into it. Read this before changing the planner, the profiles, or the templates.

## Module map

| Module | Responsibility |
|---|---|
| `src/cli.ts` | Argument parsing, exit codes, and post-actions (`--install`, `--git`). |
| `src/options.ts` | Validates flags, fills defaults from detection, and runs the interactive prompts. |
| `src/detect.ts` | Reads manifests, lockfiles, workspaces, and instruction files; infers stack and facts. |
| `src/profiles.ts` | Stack profiles: commands, conventions, layout, verification prose, and gate file lists. |
| `src/plan.ts` | The plan: rendered core documents, note-tree markers, gate files, budget manifest, and package.json merge. |
| `src/render.ts` | Template loading and placeholder substitution that fails loud. |
| `src/apply.ts` | Writes the plan, merges manifests, and classifies created, kept, and unchanged files. |
| `src/report.ts` | Human summary and JSON report, including `needsAttention` and next steps. |
| `src/templates/core/` | Stack-neutral prose: instructions, docs, notes, and skills. |
| `src/templates/node/` | TypeScript gates run by `tsx`, plus the scripts tsconfig. |
| `src/templates/python/` | Stdlib-only gate runner. |
| `scripts/` | This repository's own gates, including `verify-templates`. |

## Data flow

`main` resolves flags with `resolveOptions` (detection plus optional prompts), builds a `ScaffoldPlan` with `buildPlan`, then either writes it with `applyPlan` or previews it with `previewPlan`. `--dry-run` swaps only the apply step, so a preview cannot drift from a real run. The report reads the plan and the apply outcome; it never re-derives file content.

## Extension points

A new stack is one `StackProfile` in `src/profiles.ts` plus a template pack under `src/templates/<id>/`. Add the profile to `PROFILES` and `PROFILE_LIST`, list its gate files, and extend `TemplateId`. `verify-templates` renders every profile and rejects a template that no profile uses.

A new standing document is a template under `src/templates/core/`, an entry in `CORE_DOCUMENTS` or `MONOREPO_DOCUMENTS`, and a ceiling in `DOCUMENT_BUDGETS`. The generated `doc-budgets.manifest.json` is derived from the files the plan actually emits.

## Design decisions

Architectural decisions live in [Agent Notes](../.agents/notes/README.md) under the `architecture` class. The stack-profile split and its rejected alternatives are recorded in [the scaffold refactor note](../.agents/notes/implemented/process/2026-10-21-stack-profiles-cli.md).

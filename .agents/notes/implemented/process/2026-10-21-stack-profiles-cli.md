# Agent Note: Stack profiles and a create-style CLI

Status: implemented

## Problem

The first release scaffolded one TypeScript-flavored specification set into every repository. It always wrote a `package.json`, always emitted `tsx` gates, and described ESM and `strict` TypeScript even in Python or Go repositories. It also offered no `--dry-run`, ignored `--skip-install`, detected the package manager by probing installed binaries instead of reading lockfiles, and reported a skipped file without saying whether its content was identical or different. The tool could not honestly claim to serve "any project developed with AI".

## Decision

Split the scaffold into three layers. Detection ([src/detect.ts](../../../../src/detect.ts)) turns the target directory into facts: stack from manifests and source mix, package manager from lockfiles and the `packageManager` field, monorepo from workspace configuration, existing instruction files, CI, and tests. A stack profile ([src/profiles.ts](../../../../src/profiles.ts)) turns those facts into the stack-specific prose blocks and gate file lists. The planner ([src/plan.ts](../../../../src/plan.ts)) combines them with stack-neutral templates under `src/templates/core/` and emits a pure `ScaffoldPlan`; only [src/apply.ts](../../../../src/apply.ts) writes.

Three profiles ship: `node` (TypeScript gates run by `tsx`, `package.json` script and devDependency merge), `python` (one stdlib-only `scripts/doc_gates.py` with the same six checks), and `generic` (specification core plus a manual checklist, no scripts). `--template auto` selects from detection; `generic` never claims gates it cannot run.

The CLI gained a positional target directory, `--template`, `--dry-run`, `--json`, `--git`, `--install`, `--monorepo`, `--no-skills`, and detection-driven defaults. Existing files are reported as `kept` when they differ, and a malformed `package.json` fails the run instead of being overwritten. `--dry-run` shares the plan with the real run, so a preview cannot drift.

## Alternatives considered

**Keep one TypeScript-only template.** It is less code, but it misdescribes every non-Node repository and teaches future agent sessions to ignore the instructions. A specification system that lies about the stack fails at its only job.

**Emit every stack's gates into every repository.** Copying the TypeScript gates into a Go project creates scripts nothing can run; the failures train people to ignore red output. Gates are emitted only where the toolchain can execute them, and the generic profile says plainly that verification is manual.

**Let the agent adapt the repository at runtime instead of the CLI.** The `spec-init` skill already does semantic adaptation, but without a deterministic generator there is no reproducible baseline, no `--dry-run`, and no gate coverage for the scaffold itself. The CLI produces the baseline; the skill adapts it.

**Copy deepseek-harness's full gate set.** Most of those gates encode rules of that codebase (plugin exports, session-log reconstruction, capability seams). Copying them into arbitrary repositories produces noise. The six retained checks are the ones whose inputs exist in any repository with Markdown and notes.

**Use a template engine such as Handlebars.** The scaffold needs conditional prose, not conditionals in templates. Generating the blocks in TypeScript keeps every command derived from detected facts, and rendering a template with an unknown variable remains a hard error.

## Consequences

- A new stack is a profile plus a template pack; `npm run verify-templates` rejects a pack that no profile uses, and it renders every profile to check placeholders, trailing newlines, and budgets before a release.
- Tests now scaffold a real Node and Python project and run the generated gates, including negative controls that make a gate fail.
- The repository's own instructions and docs were rewritten to describe this tool; the previous files were the unedited template.
- Windows and Python remain first-class: the generated Python runner uses only the standard library, and the Node runner resolves its local `tsx` instead of relying on a shell PATH lookup.
- Budget ceilings are per profile: the emitted `doc-budgets.manifest.json` lists only files the run actually writes.

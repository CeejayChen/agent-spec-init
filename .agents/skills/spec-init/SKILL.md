---
name: spec-init
description: Use when asked to initialize, bootstrap, or adapt an AI agent development specification system (layered AGENTS.md, Agent Notes, Skills, verification gates) with agent-spec-init — assesses the target project, runs the scaffolder non-interactively, adapts generated files to the project's real stack, and verifies the result.
---

# Bootstrapping an agent specification system

**This skill is guidance, not a complete checklist.** The scaffolder emits a runnable starting point; the value you add is accurate adaptation. Every generated file must describe the target project as it actually is, be merged into an existing file, or be deleted. A framework that misdescribes the project teaches every future agent session to ignore it.

## When this skill applies

- **Fresh bootstrap** — the project has no `AGENTS.md` / `.agents/` yet: run all phases in order.
- **Adapt an existing scaffold** — `.agents/notes/` already exists: skip Phase 1 and apply Phases 2–4 to the changed aspect only (new subsystem, stack migration, new docs tier).

## Phase 0 — Assess before writing anything

1. **Inventory existing instruction surfaces.** Find `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `GEMINI.md`, and prior spec systems (Spec-Kit `.specify/`, OpenSpec `openspec/`, ADR folders). Collect the unique rules each carries — they must survive the bootstrap.
2. **Detect the stack.** Package manager from the lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`); language, build, and test commands from the manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`); monorepo from workspace configuration; CI from `.github/workflows/`.
3. **Fix the flag set from evidence, not defaults:**

| Flag | Rule |
|---|---|
| `--template` | Pass `node`, `python`, or `generic` explicitly. `node` and `python` emit runnable gates; `generic` emits the specification core with a manual checklist — use it for Go, Rust, and other stacks, and say so in the report. |
| `--name` | The `package.json` / `pyproject.toml` name when present, else the repository directory name. |
| `--pm` | The lockfile's package manager; `npm` when there is no lockfile. Only meaningful for `node`. |
| `--lang` | `bilingual` when the project already maintains `.zh.md` docs or a Chinese README; otherwise `en`. |
| gates | Keep for `node` and `python`. Pass `--no-gates` only when the team cannot run the generated gate commands. |
| `--monorepo` | Pass when workspace packages exist; the scaffold then emits `packages/AGENTS.md` and `packages/README.md`. |
| `--force` | Never when any instruction file already exists — the scaffolder would overwrite it; merge manually instead. |

## Phase 1 — Run the scaffolder

Always run non-interactively: an agent session cannot answer prompts, so pass `-y` with every decision explicit. Run from the repository root:

```sh
npx github:CeejayChen/agent-spec-init . -y --name <name> --template <node|python|generic> --pm <npm|pnpm|yarn> --lang <en|bilingual>
```

Read the created/kept/error report before touching anything. A kept file existed with different content: plan a manual merge in Phase 2, and never re-run with `--force` to "fix" it. For machine consumption add `--json`; the payload carries `files.created`, `files.kept`, `needsAttention`, and `nextSteps`.

The `node` profile appends gate scripts plus `tsx`/`typescript` devDependencies to `package.json` but does not install — run the package manager's install command before Phase 3. The `python` profile writes stdlib-only gates under `scripts/` and needs no install.

## Phase 2 — Adapt every generated file

Work file by file; the report lists what was written, but only the target repository supplies the truth that goes inside.

| Generated file | Adaptation |
|---|---|
| `AGENTS.md` | Verify Commands against the real scripts and Repository layout against the real tree. Keep only conventions the team will follow; delete stack rules the project cannot honour, and never leave rules nobody accepted. |
| `docs/architecture.md` | Replace every `TODO(agent-spec-init)` row with the module's real responsibility. When a fact is unknown, state the gap and report it — fabricating architecture is worse than admitting one. |
| `docs/development.md` | Verify prerequisites, setup, and the daily workflow against a clean checkout. |
| `docs/testing.md` | Align tiers, mock rules, and snapshot policy with the project's actual runner and test layout. |
| `docs/defensive-patterns.md` | Keep as forward-looking policy; prune only sections the stack makes structurally impossible. |
| `packages/AGENTS.md`, `packages/README.md` | Present only with `--monorepo`; delete both for a single-package repository and say so. |
| `.agents/notes/` | Keep whole — the lifecycle and classification tree is the system's core. |
| `.agents/skills/*` | Keep `code-review` and `prose-standard`; adapt `pre-push-checks` to the real commands; drop skills referencing tooling the project does not use. |
| `scripts/verify-*` (node) or `scripts/doc_gates.py` (python), `scripts/doc-budgets.manifest.json` | Retune budgets to the adapted docs — shorten prose or consciously raise the manifest value; never leave a budget the docs violate. |

Merge rules that cut across files:

- **Merge, don't discard.** Unique rules from pre-existing instruction files fold into the new `AGENTS.md`; leave a one-line pointer in the old file for tools that read only that path.
- **Erase the template.** Grep the generated files for leftover double-brace placeholders and for `TODO(agent-spec-init)`; fill or disclose every hit in the final report.
- **Every command is verified.** A command written into `AGENTS.md` has been run successfully in this session, or is labelled unverified.

## Phase 3 — Verify

- Node: run `npm run test:docs` (quick), then `npm run doc-sync`. Python: run `python scripts/doc_gates.py doc-quick`, then `doc-sync`. Fix wrap violations (one physical line per paragraph), broken relative links, and budget overruns before claiming success.
- Gates skipped: apply the same two disciplines by hand — single-line paragraphs and resolvable relative links.
- Run the project's own typecheck or lint when `package.json` changed.

## Phase 4 — Record and report

1. **Write the project's first Agent Note** at `.agents/notes/implemented/process/<date>-agent-spec-bootstrap.md` in the scaffolded note format: which flags were chosen and why, which files were deleted, what was merged from where.
2. **Commit as one bootstrap commit** (or PR) whose message lists generated, adapted, merged, and deleted files.
3. **Report gaps honestly:** unknowns left as `TODO(agent-spec-init)`, gates skipped and why, conventions deleted and why.

## Guardrails

- Never overwrite a hand-written instruction file; merging is the only path past an existing `AGENTS.md`.
- Never invent project facts — commands, layout, architecture — that were not observed.
- Never leave a placeholder in a file you claim is done.

# Agent Note: spec-init bootstrap skill

Status: implemented

## Problem

agent-spec-init scaffolds generic templates, but bootstrapping a real repository requires tacit procedure an agent has nowhere to read: assess existing instruction surfaces (`AGENTS.md`, `CLAUDE.md`, Spec-Kit, ADR folders), choose CLI flags from evidence, merge instead of overwrite, adapt every generated file to the real stack, verify gates, and record the bootstrap. Without a written procedure each run improvises, and improvisation fails in predictable ways — overwritten hand-written `AGENTS.md` files, fabricated architecture facts, and placeholder-filled docs reported as done.

## Decision

Add `.agents/skills/spec-init/SKILL.md`, a placement-portable bootstrap skill encoding the four-phase procedure: assess (inventory, stack detection, evidence-based flag table), scaffold non-interactively, adapt file by file under explicit merge rules, verify gates, then dogfood by writing the target project's first Agent Note. The skill uses no repository-relative links — absolute GitHub URLs and code spans only — so the same file works in this repository and in any target project it is copied into.

Installation is one command on three paths. The skills-ecosystem installer (`npx skills add CeejayChen/agent-spec-init`, the antfu/skills-cli standard) auto-detects installed agent apps and is the recommended one-click path. The CLI itself also self-installs: `--skill-only` writes only the bundled skill (`src/templates/core/skills/spec-init.md`) to `.agents/skills/spec-init/` with no prompts and no full scaffold, and `--skill-only --global` targets the user-level `~/.agents/skills/`; the `verify-templates` gate pins the bundled template to the repository skill so the two cannot drift. Manual `curl` remains as the dependency-free fallback. The README documents all three.

## Alternatives considered

- **Ship the skill as a scaffold template:** a scaffolded project would receive it automatically, but by then the bootstrap is done and the file is dead weight in every new scaffold; `spec-init.md` therefore ships in the templates directory for `--skill-only` but stays out of the default `includeSkills` set. Revisit if the skill grows an extend/maintain-the-framework role that scaffolded projects need.
- **Document the procedure in `docs/cookbook` instead:** a cookbook guide is read only when sought, while a skill's frontmatter description lets an agent app dispatch it at the right moment; procedure that must fire automatically belongs in a skill.
- **Rely solely on the skills-ecosystem installer:** zero code to maintain, but it is a third-party dependency that needs network access and its agent-coverage list we do not control; the CLI's own `--skill-only` keeps a self-contained path that an agent can run knowing nothing but the package name.

## Consequences

- Repository gates now cover the skill: `verify-md-wrap`, `verify-md-links`, and any future budget checks apply to it like any other repo Markdown.
- The skill hardcodes the current CLI flag surface (`--template`, `--name`, `--pm`, `--lang`, `--monorepo`, `--no-gates`, `--json`, `-y`); changing agent-spec-init flags requires updating the skill in the same PR. The skill's `--template` rule uses the `node`, `python`, and `generic` profiles added by [the stack-profile refactor](2026-10-21-stack-profiles-cli.md).
- The `--skill-only` install surface adds two more flags to the same contract, and the `verify-templates` gate ties `src/templates/core/skills/spec-init.md` to `.agents/skills/spec-init/SKILL.md`.
- `--global` writes outside any project (user-level `~/.agents/skills/`), which is intended but worth remembering when reviewing install reports.
- Bootstrap runs become reviewable artifacts: the Phase 4 note plus a single bootstrap commit make each initialization auditable.

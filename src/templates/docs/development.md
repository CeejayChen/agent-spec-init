# Development guide

{{BILINGUAL_HEADER}}

The setup tutorial takes a new contributor from prerequisites to a checked checkout. The contributor reference that follows covers repository layout, daily workflow, and CI organization.

## Setup tutorial

### Prerequisites

- Node.js 18+ (LTS recommended)
- {{PACKAGE_MANAGER}} (latest stable)
- Git 2.26+

### First-time setup

Install dependencies from the repo root:

```sh
{{PM}} install
```

Run typecheck once after a fresh clone:

```sh
{{PM_RUN}} typecheck
```

Setup is complete when `{{PM_RUN}} typecheck` exits successfully.

## Contributor reference

### Project layout

```
.agents/       Agent workflows, Notes, and Skills
docs/          Architecture, development guide, defensive patterns, testing policy
scripts/       Verification gates and generators
packages/      Project packages
```

### Daily workflow

1. Create a feature branch from the main branch.
2. Make changes, ensuring `{{PM_RUN}} typecheck` and `{{PM_RUN}} lint` pass.
3. Add or update an Agent Note for non-trivial changes.
4. Run `{{PM_RUN}} doc-sync` to verify documentation gates.
5. Open a PR with a clear description and linked Agent Notes.

### CI overview

CI runs the following checks:

- `{{PM_RUN}} typecheck` — TypeScript compilation
- `{{PM_RUN}} lint` — Code style and quality
- `{{PM_RUN}} test` — Unit tests
- `{{PM_RUN}} doc-sync` — Documentation gates

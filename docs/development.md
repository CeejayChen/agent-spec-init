# Development guide



The setup tutorial takes a new contributor from prerequisites to a checked checkout. The contributor reference that follows covers repository layout, daily workflow, and CI organization.

## Setup tutorial

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm (latest stable)
- Git 2.26+

### First-time setup

Install dependencies from the repo root:

```sh
npm install
```

Run typecheck once after a fresh clone:

```sh
npm run typecheck
```

Setup is complete when `npm run typecheck` exits successfully.

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
2. Make changes, ensuring `npm run typecheck` and `npm run lint` pass.
3. Add or update an Agent Note for non-trivial changes.
4. Run `npm run doc-sync` to verify documentation gates.
5. Open a PR with a clear description and linked Agent Notes.

### CI overview

CI runs the following checks:

- `npm run typecheck` — TypeScript compilation
- `npm run lint` — Code style and quality
- `npm run test` — Unit tests
- `npm run doc-sync` — Documentation gates

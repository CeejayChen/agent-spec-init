# AGENTS.md

MY COOL PROJECT uses an AI agent development specification system to ensure consistent, high-quality contributions. Read [docs/architecture.md](docs/architecture.md) before changing source code.

## Repository layout

```
.agents/       Agent workflows, Notes, and Skills
docs/          Architecture, development guide, defensive patterns, testing policy
scripts/       Verification gates and generators
packages/      Project packages
```

## Commands

```sh
npm install            # install dependencies
npm run typecheck       # TypeScript type checking
npm run lint            # linting
npm run test            # unit tests
npm run doc-sync        # all documentation gates
npm run test:docs       # quick documentation checks (no build)
```

## Conventions

- **ESM everywhere.** `"type": "module"` in every package.
- **Strict TypeScript.** `strict: true` with `noImplicitAny`; every remaining `any` explains why.
- **Registrations are effects.** Every contribution goes through explicit lifecycle hooks.
- **Runtime invariants assert owned relationships.** Check authoritative data streams, not method presence or fixed examples.
- **Switch on discriminant tags.** Closed unions end in `assertNever`.
- **Model-visible = logged.** Anything that reaches a model request must be reconstructable from the session log.
- **Plugins, not loop changes.** New behavior goes on documented extension points.
- **Explicit > implicit at package boundaries.** Defaulting is an explicit resolve step, never a hidden fallback.
- **No hardcoded tunables.** Deployment-varying choices are validated config fields.
- **Misconfiguration fails loud** at load or the earliest resolvable point; never silently skip.
- **Opaque cross-boundary ids are branded**, never bare `string`.
- **Trust TypeScript at typed same-process boundaries.** Validate at config, wire, file, and process boundaries.
- **An empty catch names what it swallows** and why nothing else can reach it.
- **Prefer symmetry for parallel values.** Unexplained asymmetry usually signals a missed extraction.
- **Tests describe behavior, not correctness.** Change obsolete behavior with its tests.
- **Non-trivial changes MUST include an Agent Note in the same PR.** Only mechanical/local edits are exempt ([scope](.agents/notes/README.md#when-to-write-one)).
- **Choose PR history deliberately.** Split independent changes; fix the introducing PR before propagation.
- **TODO markers:** `FIXME`/`TODO`/`XXX` by urgency.
- Files end with exactly one trailing newline.

## Defensive patterns

Read [docs/defensive-patterns.md](docs/defensive-patterns.md) before lifecycle, concurrency, subprocess, or teardown work.

## Type safety and documentation

Every module and export has concise JSDoc for its non-obvious contract; function-like exports include `@param`/`@returns`. Comments state complete contracts and context, not reasoning transcripts. Write directly: name actors and facts. Use concrete terms — write "response fields" or "JSON validation", not "response shape" or "validation boundary".

Docs accompany every code change: update affected README and JSDoc contracts together.

## Agent Notes

[Agent Notes](.agents/notes/README.md) are durable proposals and decision records that preserve rationale, alternatives, consequences, and required verification. Every non-trivial change MUST add or update at least one Agent Note in the same PR.

## Run relevant checks locally

Match evidence to the surface: focused behavior tests, doc-sync for docs, and built smokes for published paths. Never default to the full suite. CI owns exhaustive coverage; rehearse all locally only by explicit request.

## Editing these instructions

Edit this file directly. Keep each rule self-contained while linking high-level docs. Condense when clarity survives.

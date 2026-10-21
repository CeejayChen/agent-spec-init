# AGENTS.md

agent-spec-init installs an AI agent development specification system into other repositories. Read [docs/architecture.md](docs/architecture.md) before changing detection, profiles, the planner, or templates.

## Repository layout

```
src/       CLI, detection, options, planner, profiles, templates
scripts/   this repository's own verification gates
docs/      architecture, development guide, testing policy, defensive patterns
.agents/   Agent Notes and Skills
```

## Commands

```sh
npm install         # install dependencies
npm run build       # compile src/ and copy templates into dist/
npm run typecheck   # tsc --noEmit
npm test            # unit and integration tests
npm run test:docs   # quick documentation gates
npm run doc-sync    # every documentation gate
```

## Conventions

- **The plan is the product.** `buildPlan` produces every file as data; only [src/apply.ts](src/apply.ts) writes to disk. A feature that writes during planning breaks `--dry-run` and the tests.
- **Templates stay content-only.** Placeholder substitution and stack-specific prose belong to [src/render.ts](src/render.ts) and [src/profiles.ts](src/profiles.ts); a template with logic cannot be reviewed as prose.
- **Rendering fails loud.** An unknown placeholder or a marker left after rendering is an error, never pass-through text.
- **Profiles own stack prose.** Commands, conventions, layout, and verification wording are generated from detected facts. Never write a command the target repository does not have.
- **Detection reports only what the filesystem proves.** Manifests, lockfiles, and workspace files decide the stack; no filename heuristics that a fixture cannot reproduce.
- **Every gate has a negative control.** A gate added without a test that makes it fail has not been shown to work.
- **One home per fact.** Standing rules live here, structure in [docs/architecture.md](docs/architecture.md), workflow in [docs/development.md](docs/development.md), and reasoning in Agent Notes.
- **Explicit over implicit.** Defaults are resolved in [src/options.ts](src/options.ts) in one visible step.
- **Fail loud.** An invalid flag, a malformed `package.json`, or a missing template stops the run with an actionable message.
- **Docs move with the code.** A behavior change updates the owning document in the same change.
- **Tests describe behavior.** Change obsolete behavior with its tests; never delete a failing assertion to make a suite green.
- **No dead scaffolding.** Delete what nothing calls; `verify-templates` rejects a template no profile uses.
- **Files end with exactly one trailing newline.** Rendering normalizes text to that shape.

## Type safety and documentation

Every module and exported function carries JSDoc for its non-obvious contract, including `@param`/`@returns` for exported functions. Comments state actors, conditions, and consequences; they never narrate a reasoning process.

## Agent Notes

[Agent Notes](.agents/notes/README.md) record the why, the rejected alternatives, and the consequences of every non-trivial change. Add or update one in the same change.

## Documentation is bilingual

Documents under `docs/` that carry a `.zh.md` companion also carry an `.i18n.yaml` sidecar recording both blob hashes. After editing either language, run `npx tsx scripts/verify-translation-pairing.ts --write <english-file>` and commit the triplet together. Notes follow the same pattern where a pair exists.

## Verification

Match evidence to the surface: `npm test` for code, `npm run test:docs` while editing prose, and `npm run doc-sync` before handing off. CI runs the exhaustive matrix; do not repeat a passing check for the same commit.

## Editing these instructions

Edit this file directly. Keep each rule self-contained and link the document that owns the detail. Condense when clarity survives.

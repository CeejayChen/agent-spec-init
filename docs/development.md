# Development guide

Onboarding for agent-spec-init: prerequisites, setup, the daily workflow, and what CI runs.

## Prerequisites

- Node.js 20 or newer (the build script uses `import.meta.dirname`)
- npm, matching `package-lock.json`
- Git 2.26 or newer
- Python 3.10 or newer to exercise the generated Python gates locally

## Setup

Install dependencies and build the distributable:

```sh
npm install
npm run build
```

Run the test suite once to confirm the checkout:

```sh
npm test
```

Setup is complete when `npm test` and `npm run doc-sync` both exit successfully.

## Trying the CLI locally

`npm run dev` runs the CLI from `src/`. To exercise the packaged path, run `node dist/bin.js <target> --dry-run` after a build. Always scaffold into a disposable directory; `--force` can replace files in the target.

## Daily workflow

1. Branch from `main`.
2. Make the change, keeping `npm run typecheck` and `npm test` green.
3. Add or update an Agent Note for every non-trivial change.
4. Run `npm run doc-sync` and fix every violation before writing the pull request.
5. Open a pull request that states the change, its evidence, and the Agent Notes it adds or updates.

## Changing a generated document

Edit the template under `src/templates/`, not `dist/`. Then run `npm run build`, `npm run verify-templates`, and `npm test`; the integration tests scaffold each profile and run its gates. A budget change belongs in `DOCUMENT_BUDGETS` in [src/plan.ts](../src/plan.ts), justified in the same pull request.

## CI

CI runs `npm ci`, `npm run build`, `npm run typecheck`, `npm test`, and `npm run doc-sync` for every pull request and every push to `main`. The workflow lives in `.github/workflows/ci.yml`; keep it in sync with the commands above.

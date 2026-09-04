# Agent Note: Git installs shipped without the CLI binary

Status: implemented

## Problem

`npx github:CeejayChen/agent-spec-init` installed the package but failed with "'agent-spec-init' is not recognized", and npm warned "gitignore-fallback: No .npmignore file found, using .gitignore for file exclusion". The package's `bin` points at `dist/index.js`, but `dist/` is listed in `.gitignore`, so npm's pack step — which falls back to `.gitignore` when no `.npmignore` exists — excluded the compiled CLI from the git-installed package.

## Decision

Declare the published surface explicitly: `"files": ["dist"]` whitelists the build output, and files in the `files` whitelist cannot be excluded by `.gitignore` or `.npmignore`. Add `"prepare": "npm run build"` so the compiled CLI and copied templates exist at install time; npm runs `prepare` when installing a git dependency, before packing.

## Alternatives considered

- **Commit `dist/` to the repo:** would make git installs work without a build step, but tracks generated artifacts and contradicts the repo's `.gitignore` policy.
- **Add `.npmignore` alone:** silences the warning, but cannot include a directory that is absent from the checkout; without `prepare` there is still no `dist/` to pack.
- **Publish to npm:** registry installs follow the same packing rules, so the fix would apply there too, but npm is out of scope for now.

## Consequences

- `npx github:CeejayChen/agent-spec-init` and `npm install -g github:...` now build `dist/` at install time and ship it.
- Version bumped to 0.1.1; a stale npx cache from 0.1.0 must be cleared (`rm -rf ~/.npm/_npx`) to pick up the fix.
- A future `npm publish` ships only `dist/` plus package.json and README — the intended runtime surface.

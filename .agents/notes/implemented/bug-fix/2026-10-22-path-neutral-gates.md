# Agent Note: Path-neutral file discovery in generated gates

Status: implemented

## Problem

The generated `verify-export-jsdoc` gate filtered collected files with the forward-slash substring `/src/`. On Windows, `collectFiles` returned backslash paths, so the filter matched zero files and the gate printed success without checking anything: a gate that cannot fail. CI on Linux, where the separator matched, flagged an undocumented export in the scaffold's own test fixture, which had been written without JSDoc. The same separator assumption made `verify-md-wrap`'s archived-notes exclusion ineffective on Windows.

## Decision

`collectFiles` returns forward-slash paths on every platform, and every gate that filters by path segment uses separator-agnostic patterns that accept either slash around a segment name such as `node_modules` or `vendor`. Diagnostics print repository-relative paths with forward slashes, so output is stable across platforms. The JSDoc gate also accepts a single-line `/** contract */` comment, and the test fixture documents its export.

## Alternatives considered

**Fix only the test fixture.** CI would go green while the Windows gate stayed vacuous; the underlying defect would ship to every generated project.

**Branch on `path.sep` in each filter.** Every filter would carry two code paths and the archived-note exclusion would still be easy to get wrong; returning one canonical separator is simpler and keeps diagnostics stable.

**Add a glob library.** A dependency for the generated gates contradicts their stdlib-and-devDependency-only design; normalization solves the actual problem.

## Consequences

- `tests/repo-files.spec.ts` pins the separator contract, and a new negative control proves the JSDoc gate flags an undocumented export instead of passing vacuously.
- Generated projects on Windows now run the export-documentation gate for real. A project that passed with undocumented exports will report violations, which is the contract the generated documentation already states.

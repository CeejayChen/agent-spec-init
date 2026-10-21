# Defensive patterns

Hard-won bug-class rules: each pattern below is a class of defect that actually shipped or nearly shipped, stated as the rule that prevents its recurrence. Read this before writing lifecycle, subprocess, or teardown code.

## Report orthogonal outcomes independently

A result can be several things at once — a process can time out AND exit 0 because it trapped the signal. Surface each independent fact on its own; never nest one flag's report inside another's branch, or a caller reads a cut-short run as a clean success.

## Dispose must reach quiescence, not just request it

A teardown that issues kills or aborts but returns before the work stops leaves orphans. Await the child's exit, and close registries before killing so late completions stay silent. The gate runner waits for every spawned gate before printing its summary for this reason.

## Contain callback exceptions in the dispatcher

A user-supplied listener that throws must not reject the promise it runs inside or starve the listeners after it. Wrap the dispatch loop in try/catch and log; one bad subscriber never breaks core lifecycle.

## Never hand untrusted output the ambient environment or predictable paths

Spawned commands get a scrubbed environment (drop `*KEY*`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`) so credentials cannot leak into output. Temp and spill files use a private directory, random names, and exclusive owner-only opens — predictable world-readable paths invite symlink races and disclosure.

## Fail before writing, not after

Validate flags, templates, and JSON manifests before touching the target repository. The scaffolder parses an existing `package.json` and reports invalid JSON instead of overwriting it; a half-written specification set is worse than no run.

## Unlink link-shaped paths

A path that may be a symlink or junction is removed with `lstat` followed by `unlink`: unlink deletes only the link and refuses a real directory, so it never follows the link into its target. Reserve recursive deletion for known real directories.

---

*Add a pattern when a bug class recurs: state the defect class and the rule that prevents it.*

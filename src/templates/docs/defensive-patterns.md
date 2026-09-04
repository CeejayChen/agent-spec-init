# Defensive patterns

{{BILINGUAL_HEADER}}

Hard-won bug-class rules: each pattern below is a class of defect that actually shipped or nearly shipped, stated as the rule that prevents its recurrence. Read this before writing lifecycle, concurrency, subprocess, or teardown code.

## Report orthogonal outcomes independently

A result can be several things at once — a process can time out AND exit 0 because it trapped the signal. Surface each independent fact on its own; never nest one flag's report inside another's branch, or a caller reads a cut-short run as a clean success.

## Async state is not synchronous state

Never treat a status event or idle signal as the result of one specific operation. Several queued operations, steering, and injected work may share one interval. An automation caller that truly owns a run must define its interval explicitly. If the awaited transition can never occur, the wait hangs — handle the "nothing to wait for" branch explicitly.

## Dispose must reach quiescence, not just request it

A teardown that issues kills/aborts but returns before the work stops leaves orphans. Make cleanup async and await the children's exit, and close listener/notification registries BEFORE killing so late completions stay silent.

## Contain callback exceptions in the dispatcher

A user-supplied listener that throws must not reject the promise it runs inside or starve the listeners after it. Wrap the dispatch loop in try/catch and log; one bad subscriber never breaks core lifecycle.

## Never hand untrusted output the ambient environment or predictable paths

Spawned commands get a scrubbed env (drop `*KEY*`/`*SECRET*`/`*TOKEN*`/`*PASSWORD*`) so credentials cannot leak into output. Temp/spill files use a private dir, random names, and exclusive owner-only opens — predictable world-readable paths invite symlink races and disclosure.

## Unlink link-shaped paths

A path that may be a symlink or junction is removed with `lstatSync().isSymbolicLink()` then `unlinkSync`: unlink deletes only the link and refuses a real directory, so it never follows the link into its target. Reserve recursive deletion for known real directories.

---

*Add project-specific patterns as you encounter new bug classes. Each pattern should state the defect class and the rule that prevents it.*

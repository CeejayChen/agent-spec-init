# AGENTS.md — Packages

These rules apply inside `packages/`. Root [AGENTS.md](../AGENTS.md) carries the repository-wide rules; this file adds only what changes for a workspace package.

- **Each package README is its consumer contract.** It states configuration, semantics, failures, limitations, and extension points. Comment restatement and other packages' concerns stay out.
- **Publish through the manifest.** Consumers import the package's declared entry points; deep imports into another package's internals are defects.
- **Keep tests with the package.** A package's tests run through the workspace command and do not reach into a sibling package's internals.
- **One owner per shared abstraction.** An abstraction used by two packages lives in the package that owns the contract, or it moves to a shared package with its own Agent Note.
- **A cross-package change records one Agent Note** in the change that introduces it, naming the contract and the alternative that lost.
- **Deleting a package requires evidence.** Name the consumers that disappeared and the migration that replaced them.
